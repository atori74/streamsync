let isScanning = false;
let isHost = false;
let isClient = false;
let conn;

const ENDPOINT = 'wss://streamsync-server-zbj3ibou4q-an.a.run.app'
// const ENDPOINT = 'ws://localhost:8080'


const sleep = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

const popupLog = msg => {
	chrome.storage.local.get(['userLog'], data => {
		let logs = data.userLog;
		if(logs) {
			logs.push(msg);
		} else {
			logs = [msg,];
		}
		chrome.storage.local.set({'userLog': logs}, undefined);
	})
}

const sendPlaybackPosition = async () => {
	if(conn.readyState == WebSocket.CLOSED) {
		console.log("sendPlaybackPosition: conn closed")
		return;
	}
	if(conn.readyState == WebSocket.OPEN) {
		chrome.storage.local.get(['pbPosition', 'currentTime', 'mediaURL'], data => {
			if(!(data.pbPosition && data.currentTime && data.mediaURL)) {
				console.log("data in storage is not enough to send PB")
				return
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
}

const scanCurrentTime = async tabId => {
	chrome.tabs.onRemoved.addListener((id, removeInfo) => {
		if(tabId == id) {
			console.log('taget tab was removed');
			isScanning = false;
			conn.close();
			return;
		}
	})

	while(true) {
		chrome.tabs.get(tabId, tab => {
			if(tab.url.match(new RegExp('youtube.com/watch'))) {
				chrome.tabs.executeScript(
					tab.id,
					{code: 'syncCtl.sendPlaybackPosition();'}
				);
			}
		});
		// 2秒に1回に変更
		await sleep(2000);
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
					conn = new WebSocket(ENDPOINT + '/new');
					isHost = true;
					conn.onclose = () => {
						console.log('connection closed');
						isHost = false;

						isScanning = false;
						console.log('scan off')

						closeConnection();
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
					// TODO
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

				conn = new WebSocket(ENDPOINT + '/join/' + roomID);
				isClient = true;

				conn.onclose = () => {
					console.log('connection closed');
					isClient = false;

					closeConnection();
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
				// content scriptで取得したPBを受けとり、storageに保存
				console.log(msg.data);
				chrome.storage.local.set({
					'pbPosition': msg.data.position,
					'currentTime': msg.data.currentTime,
				}, undefined);
				popupLog('playback: ' + msg.data.position);
				chrome.runtime.sendMessage({'type': 'FROM_BG', 'command': 'reloadLog'}, undefined);

				sendPlaybackPosition();
				return;
			}

			// content scriptで動画の状態を監視、statusの変化を受け取る
			if(msg.command == 'played') {
				console.log('EVENT: played');
				return;
			}
			if(msg.command == 'paused') {
				console.log('EVENT: paused');
				return;
			}
			if(msg.command == 'seeked') {
				console.log('EVENT: seeked');
				return;
			}
			if(msg.command == 'adInterrupted') {
				console.log('EVENT: adInterrupted');
				return;
			}
		}
	})
});

