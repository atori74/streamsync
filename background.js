let isScanning = false;
let isHost = false;
let conn;

const SERVER_HOST = 'localhost:8889'

const sleep = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

// const ytPostCurrentTime = () => {
// 	let code = [
// 		"vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
// 		"chrome.runtime.sendMessage({type: 'FROM_PAGE', command: 'playbackPosition', data: vid.currentTime}, undefined);",
// 		"vid.currentTime;"
// 	]
// 	return code.join('\n');
// }

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
				} else {
					console.log('Your browser does not support WebSockets.');
				}
			}
			if(msg.command == 'closeRoom') {
				if(conn.readyState != WebSocket.CLOSED) {
					conn.close(1000);
					isHost = true;
				}
			}
			if(msg.command == 'joinRoom') {
				// hoge
			}
			if(msg.command == 'leaveRoom') {
				// hoge
			}
		}
		if(msg.type == 'FROM_PAGE') {
			if(msg.command == 'currentTime') {
				console.log(msg.data);
				chrome.storage.local.set({'currentTime': msg.data}, undefined);
			}
		}
	})
});

