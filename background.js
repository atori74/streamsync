let isScanning = false;
let isHost = false;
let isClient = false;
let conn;
let ENDPOINT;
let sMutex = new Mutex();


const sleep = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

const rerenderPopup = async log => {
	const release = await sMutex.acquire();
	let [allLogs, err] = await getStorage(['session', 'userLog']);
	if(err != undefined) {
		console.log(err)
		return;
	}
	if(allLogs) {
		allLogs.push(log);
	} else {
		allLogs = [log,];
	}

	// ログにメッセージをappendした後で、popupをrenderしたいのでawaitをつかう
	await setStorage('session', {'userLog': allLogs});
	release();

	chrome.runtime.sendMessage({
		'type': 'FROM_BG',
		'command': 'rerenderView',
	})
}

const appendUserLog = async logs => {
	if(!logs) {
		return;
	}
	const release = await sMutex.acquire();
	let [allLogs, err] = await getStorage(['session', 'userLog']);
	if(err != undefined) {
		console.log(err)
		return;
	}

	// Logの上限はだいたい1000くらいになるようにする
	if (!allLogs) {
		allLogs = logs
	} else if (allLogs.length > 1000) {
		allLogs = allLogs.slice(allLogs.length - 1000 + logs.length);
		allLogs.push(...logs);
	} else {
		allLogs.push(...logs);
	}

	await setStorage('session', {'userLog': allLogs});
	release();

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
		let [session, err] = await getStorage(['session']);
		if(err != undefined) {
			console.log(err);
			return;
		}
		if(!(session.pbPosition && session.currentTime && session.mediaURL)) {
			console.log("data in storage is not enough to send PB");
			return;
		}
		conn.send(JSON.stringify({
			'from': 'host',
			'type': 'playbackPosition',
			'data': {
				'position': session.pbPosition,
				'currentTime': session.currentTime,
				'mediaURL': session.mediaURL,
			}
		}));
		console.log('sent playback position to server');
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
		}));
		console.log('sent pause command to server');
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
		}));
		console.log('sent play command to server');
	}
}

const sendEpisodeChangeCommand = async data => {
	if(conn.readyState == WebSocket.CLOSED) {
		return;
	}
	if(conn.readyState == WebSocket.OPEN) {
		conn.send(JSON.stringify({
			'from': 'host',
			'type': 'command',
			'data': {
				'command': 'episodeChange',
				'position': data.position,
				'mediaURL': data.mediaURL,
				'episodeId': data.episodeId,
			},
		}));
		console.log('sent episodeChange command to server');
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
		let [roomID, err] = await getStorage(['session', 'roomID']);
		if(err != undefined) {
			console.log(err);
			return;
		}
		if(roomID) {
			chrome.tabs.get(tabId, tab => {
				if(tab.url.match(new RegExp('youtube.com/watch|amazon.co.jp/gp/video/detail|netflix.com/watch'))) {
					chrome.tabs.executeScript(
						tab.id,
						{code: 'syncCtl.sendPlaybackPosition();'}
					);
				}
			});
		}
		// 2秒に1回に変更
		await sleep(2000);
		if(!isScanning) {
			return;
		}
	}
}

chrome.runtime.onInstalled.addListener(function() {
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
					appendUserLog(['Now opening the room.',]);
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
					const release = await sMutex.acquire();
					await setStorage('session', {'mediaURL': msg.data.mediaURL});
					release();

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

				appendUserLog(['Now joining the room.']);
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
			if(msg.command == 'addOffset') {
				let release;
				release = await sMutex.acquire();
				let [offset, err] = await getStorage(['session', 'offset']);
				release();
				if(err != undefined) {
					return;
				}
				release = await sMutex.acquire();
				await setStorage('session', {
					'offset': offset + 1,
				});
				release();
				chrome.runtime.sendMessage({
					'type': 'FROM_BG',
					'command': 'reloadOffset',
				})

				return;
			}
			if(msg.command == 'reduceOffset') {
				let release;
				release = await sMutex.acquire();
				let [offset, err] = await getStorage(['session', 'offset']);
				release();
				if(err != undefined) {
					return;
				}
				release = await sMutex.acquire();
				await setStorage('session', {
					'offset': offset - 1,
				});
				release();
				chrome.runtime.sendMessage({
					'type': 'FROM_BG',
					'command': 'reloadOffset',
				})

				return;
			}
		}
		if(msg.type == 'FROM_PAGE') {
			if(msg.command == 'playbackPosition') {
				// content scriptで取得したPBを受けとり、storageに保存
				console.log(msg.data);
				const release = await sMutex.acquire();
				await setStorage('session', {
					'pbPosition': msg.data.position,
					'currentTime': msg.data.currentTime,
				});
				release();

				appendUserLog(['playback: ' + msg.data.position,]);

				sendPlaybackPosition();
				return;
			}

			// content scriptで動画の状態を監視、statusの変化を受け取る
			if(msg.command == 'played') {
				console.log('EVENT: played');
				// TODO: mediaURLと一致している場合のみ送る
				const release = await sMutex.acquire();
				let [mediaURL, err] = await getStorage(['session', 'mediaURL']);
				release();
				if(err != undefined) {
					console.log(err);
					return;
				}

				if (isHost && mediaURL && mediaURL == msg.data.mediaURL) {
					appendUserLog(['Video is playing.',]);
					sendPlayCommand();
				}
				return;
			}
			if(msg.command == 'paused') {
				console.log('EVENT: paused');
				// TODO: mediaURLと一致している場合のみ送る
				const release = await sMutex.acquire();
				let [mediaURL, err] = await getStorage(['session', 'mediaURL']);
				release();
				if(err != undefined) {
					console.log(err);
					return;
				}
				
				if (isHost && mediaURL && mediaURL == msg.data.mediaURL) {
					appendUserLog(['Video was paused.',]);
					sendPauseCommand(msg.data);
				}
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
			if(msg.command == 'episodeChange') {
				console.log('EVENT: episodeChange');
				// TODO: mediaURLと一致している場合のみ送る
				const release = await sMutex.acquire();
				let [mediaURL, err] = await getStorage(['session', 'mediaURL']);
				release();
				if(err != undefined) {
					console.log(err);
					return;
				}

				if (isHost && mediaURL && mediaURL == msg.data.mediaURL) {
					appendUserLog(['Episode changed.',]);
					sendEpisodeChangeCommand(msg.data);
				}
				return;
			}
		}
	})
});

