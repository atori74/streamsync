let isScanning = false;
let isHost = false;
let isClient = false;
let conn;
let ENDPOINT;


const sleep = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

const rerenderPopup = log => {
	chrome.storage.local.get('session', async s => {
		const data = s.session;
		let allLogs = data.userLog;
		if(allLogs) {
			allLogs.push(log);
		} else {
			allLogs = [log,];
		}

		// ログにメッセージをappendした後で、popupをrenderしたいのでawaitをつかう
		await setStorage('session', {'userLog': allLogs});

		chrome.runtime.sendMessage({
			'type': 'FROM_BG',
			'command': 'rerenderView',
		})
	})
}

const appendUserLog = logs => {
	if(!logs) {
		return;
	}
	chrome.storage.local.get('session', s => {
		const data = s.session;
		let allLogs = data.userLog;
		// Logの上限はだいたい1000くらいになるようにする
		if (allLogs.length > 1000) {
			allLogs = allLogs.slice(allLogs.length - 1000 + logs.length);
			allLogs.push(...logs);
		} else if (allLogs) {
			allLogs.push(...logs);
		} else {
			allLogs = logs
		}
		setStorage('session', {'userLog': allLogs});
	})

	// appendLogメッセージを受け取ったpopup側でstorageを読むわけじゃないので
	// この場合はsetStorageとsendMessageは非同期で良い
	chrome.runtime.sendMessage({
		'type': 'FROM_BG',
		'command': 'appendLog',
		'data': {
			'logs': logs,
		},
	})
}

const sendPlaybackPosition = async () => {
	if(conn.readyState == WebSocket.CLOSED) {
		console.log("sendPlaybackPosition: conn closed")
		return;
	}
	if(conn.readyState == WebSocket.OPEN) {
		chrome.storage.local.get('session', s => {
			const data = s.session;
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

const sendPauseCommand = async data => {
	if(conn.readyState == WebSocket.CLOSED) {
		console.log("sendPausedEvent: conn closed")
		return;
	}
	if(conn.readyState == WebSocket.OPEN) {
		conn.send(JSON.stringify({
			'from': 'host',
			'type': 'command',
			'data': {
				'command': 'pause',
				'position': data.position,
				'mediaURL': data.mediaURL,
			},
		}))
		console.log('sent pause command to server')
	}
}

const sendPlayCommand = async _ => {
	if(conn.readyState == WebSocket.CLOSED) {
		console.log("sendPlayedEvent: conn closed")
		return;
	}
	if(conn.readyState == WebSocket.OPEN) {
		conn.send(JSON.stringify({
			'from': 'host',
			'type': 'command',
			'data': {
				'command': 'play',
			},
		}))
		console.log('sent play command to server')
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
		chrome.storage.local.get('session', s => {
			const data = s.session;
			if(data.roomID) {
				chrome.tabs.get(tabId, tab => {
					if(tab.url.match(new RegExp('youtube.com/watch'))) {
						chrome.tabs.executeScript(
							tab.id,
							{code: 'syncCtl.sendPlaybackPosition();'}
						);
					}
				});
			}
		})
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

	// optionを読込
	chrome.storage.local.get('env', data => {
		if(data.env && data.env.endpoint) {
			ENDPOINT = data.env.endpoint;
		} else {
			ENDPOINT = 'wss://streamsync-server-zbj3ibou4q-an.a.run.app';
		}
		console.log('ENDPOINT:', ENDPOINT);
	})

	chrome.storage.local.onChanged.addListener(changes => {
		if (changes.env) {
			chrome.storage.local.get('env', data => {
				const envs = data.env;
				if (envs.endpoint) {
					ENDPOINT = envs.endpoint;
				} else {
					ENDPOINT = 'wss://streamsync-server-zbj3ibou4q-an.a.run.app';
				}
				console.log('ENDPOINT:', ENDPOINT);
			})
		}
	})

	// extension読込時はstorageをクリア
	clearStorage('session');

	chrome.runtime.onMessage.addListener(async msg => {
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
					await appendUserLog(['Now opening the room.',]);
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
					await setStorage('session', {'mediaURL': msg.data.mediaURL});

					return;
				} else {
					console.log('Your browser does not support WebSockets.');
					return;
				}
			}
			if(msg.command == 'closeRoom') {
				if(!conn || conn.readyState == WebSocket.CLOSED) {
					return;
				}
				conn.close(1000);
				// isHost = false;
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

				await appendUserLog(['Now joining the room.']);
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
				// closeConnection();
				isClient = false;

				return;
			}
		}
		if(msg.type == 'FROM_PAGE') {
			if(msg.command == 'playbackPosition') {
				// content scriptで取得したPBを受けとり、storageに保存
				console.log(msg.data);
				await setStorage('session', {
					'pbPosition': msg.data.position,
					'currentTime': msg.data.currentTime,
				});
				appendUserLog(['playback: ' + msg.data.position,]);

				sendPlaybackPosition();
				return;
			}

			// content scriptで動画の状態を監視、statusの変化を受け取る
			if(msg.command == 'played') {
				console.log('EVENT: played');
				// TODO: mediaURLと一致している場合のみ送る
				chrome.storage.local.get('session', data => {
					const s = data.session;
					if (isHost && s.mediaURL && s.mediaURL == msg.data.mediaURL) {
						appendUserLog(['Video is playing.',]);
						sendPlayCommand();
					}
				})
				return;
			}
			if(msg.command == 'paused') {
				console.log('EVENT: paused');
				// TODO: mediaURLと一致している場合のみ送る
				chrome.storage.local.get('session', data => {
					const s = data.session;
					if (isHost && s.mediaURL && s.mediaURL == msg.data.mediaURL) {
						appendUserLog(['Video was paused.',]);
						sendPauseCommand(msg.data);
					}
				})
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

