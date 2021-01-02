let isScanning = false;
let isHost = false;
let isClient = false;
let conn;

const SERVER_HOST = 'localhost:8889'

const sleep = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

const sendPlaybackPosition = async () => {
	while(true) {
		if(conn.readyState == WebSocket.CLOSED) {
			console.log("sendPlaybackPosition: conn closed")
			return;
		}
		if(conn.readyState == WebSocket.OPEN) {
			chrome.storage.local.get(['pbPosition', 'currentTime', 'mediaURL'], data => {
				if(!data.pbPosition) {
					return;
				}
				conn.send(JSON.stringify({
					'from': 'host',
					'type': 'playbackPosition',
					'data': {
						'position': data.pbPosition,
						'currentTime': data.currentTime,
						'mediaURL': data.mediaURL,
					}
				}));
			});
			console.log('sent playback position to server')
		}
		await sleep(5000);
	}
}

const scanCurrentTime = async tabId => {
	chrome.tabs.onRemoved.addListener((id, removeInfo) => {
		if(tabId == id) {
			console.log('taget tab was removed');
			isScanning = false;
			return;
		}
	})
	while(true) {
		chrome.tabs.get(tabId, tab => {
			if(tab.url.match(new RegExp('youtube.com/watch'))) {
				chrome.tabs.executeScript(
					tab.id,
					{code: ytPostCurrentTime()}
				);
			}
		});
		await sleep(1000);
		if(!isScanning) {
			return;
		}
	}
}

chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function(){
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {hostEquals: 'www.youtube.com'},
				}),
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {hostEquals: 'www.netflix.com'},
				})
			],
			actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});

	// extension読込時はstorageをクリア
	chrome.storage.local.clear(undefined);

	chrome.runtime.onMessage.addListener(msg => {
		if(msg.type == 'FROM_ACTION') {
			if(msg.command == 'toggleScan') {
				if(isScanning) {
					isScanning = false;
					console.log('scan toggled off');
				} else {
					isScanning = true;
					scanCurrentTime(msg.data.tabId);
					console.log('scan toggled on');
				}
			}
			if(msg.command == 'openRoom') {
				// room is already exists?
				if(isHost) {
					console.log('now already Host');
					return;
				}
				
				// send openRoom command to server
				if(window['WebSocket']) {
					conn = new WebSocket('ws://' + SERVER_HOST + '/new');
					isHost = true;
					conn.onclose = () => {
						console.log('connection closed');
						isHost = false;
						closeConnection();

						isScanning = false;
						console.log('scan off')

						chrome.storage.local.clear(undefined);
					};
					conn.onmessage = (evt) => {
						console.log('received ws frame');
						let messages = evt.data.split('\n');
						for(let i = 0; i < messages.length; i++) {
							let json = JSON.parse(messages[i]);
							handleFrame(json);
						}
					};
					// playbackPositionの取得を開始
					isScanning = true;
					scanCurrentTime(msg.data.tabId);
					console.log('scan toggled on');
					// open時のurlを記録
					// 未実装:画面遷移時にはurlを更新する
					chrome.storage.local.set({'mediaURL': msg.data.mediaURL}, undefined);
					sendPlaybackPosition(conn);
				} else {
					console.log('Your browser does not support WebSockets.');
				}
			}
			if(msg.command == 'closeRoom') {
				if(!conn || conn.readyState == WebSocket.CLOSED) {
					return;
				}
				conn.close(1000);
				isHost = true;
			}
			if(msg.command == 'joinRoom') {
				if(isHost) {
					console.log('you are host now.');
					return;
				}
				if(isClient) {
					console.log('you are already client.');
					return;
				}
				let roomID = msg.data.roomID;

				conn = new WebSocket('ws://' + SERVER_HOST + '/join/' + roomID);
				isClient = true;
				conn.onclose = () => {
					console.log('connection closed');
					isClient = false;
					closeConnection();

					chrome.storage.local.clear(undefined);
				};
				conn.onmessage = (evt) => {
					console.log('received ws frame');
					let messages = evt.data.split('\n');
					for(let i = 0; i < messages.length; i++) {
						let json = JSON.parse(messages[i]);
						handleFrame(json);
					}
				};

				return;
			}
			if(msg.command == 'leaveRoom') {
				if(!isClient) {
					console.log('leaveRoom failed: you are not client.')
					return;
				}
				conn.close(1000);
				closeConnection();
				isClient = false;

				return;
			}
		}
		if(msg.type == 'FROM_PAGE') {
			if(msg.command == 'playbackPosition') {
				console.log(msg.data);
				chrome.storage.local.set({
					'pbPosition': msg.data,
					'currentTime': (new Date()).toISOString(),
				}, undefined);
			}
		}
	})
});

