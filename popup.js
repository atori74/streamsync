window.onload = () => {
	renderView();
}

const renderView = _ => {
	chrome.storage.local.get(['status'], data => {
		if(data.status == 'host') {
			// render host view
			renderHostView();
		} else if (data.status == 'client') {
			// render client view
			renderClientView();
		} else {
			// render default view
			renderDefaultView();
		}
	})
}

const renderHostView = _ => {
	// CloseRoom, RoomID, mediaURL
	// clear main div
	const mainDiv = document.getElementById('main');
	while(mainDiv.firstChild) {
		mainDiv.removeChild(mainDiv.lastChild);
	}

	const tmp = document.getElementById('hostPage').content;
	const clone = document.importNode(tmp, true);
	main.appendChild(clone);

	document.getElementById('closeRoom').onclick = elem => {
		chrome.runtime.sendMessage({
			'type': 'FROM_ACTION',
			'command': 'closeRoom',
		})
	}

	renderRoomInfo();

	reloadLogs();
}

const renderClientView = _ => {
	// leaveRoom, RoomID, mediaURL
	// clear main div
	const mainDiv = document.getElementById('main');
	while(mainDiv.firstChild) {
		mainDiv.removeChild(mainDiv.lastChild);
	}

	const tmp = document.getElementById('clientPage').content;
	const clone = document.importNode(tmp, true);
	main.appendChild(clone);

	document.getElementById('leaveRoom').onclick = elem => {
		chrome.runtime.sendMessage({
			'type': 'FROM_ACTION',
			'command': 'leaveRoom',
		})
	}

	renderRoomInfo();

	reloadLogs();
}

const renderDefaultView = _ => {
	// OpenRoom, JoinRoom, RoomIDtoJoin 
	// clear main div
	const mainDiv = document.getElementById('main');
	while(mainDiv.firstChild) {
		mainDiv.removeChild(mainDiv.lastChild);
	}

	const tmp = document.getElementById('defaultPage').content;
	const clone = document.importNode(tmp, true);
	main.appendChild(clone);

	document.getElementById('openRoom').onclick = elem => {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			if(tabs[0].url.match(new RegExp('youtube.com/watch'))) {
				chrome.runtime.sendMessage({
					'type': 'FROM_ACTION',
					'command': 'openRoom',
					'data': {'mediaURL': tabs[0].url, 'tabId': tabs[0].id}
				}, undefined);
			}
		});
	}

	document.getElementById('joinRoom').onclick = elem => {
		chrome.tabs.query({active: true, currentWindow: true}, tabs => {
			const roomID = document.getElementById('roomToJoin').value;
			if(roomID == "") {
				appendLog('Failed to join the room: rooomID is empty');
				return
			}
			document.getElementById('roomToJoin').value = '';
			chrome.runtime.sendMessage({
				'type': 'FROM_ACTION',
				'command': 'joinRoom',
				'data': {
					'roomID': roomID,
					'tabID': tabs[0].id,
				},
			});
		});
	}

	reloadLogs();
}

const renderRoomInfo = _ => {
	chrome.storage.local.get(['roomID', 'mediaURL'], data => {
		if(data.roomID) {
			document.getElementById('roomId').textContent = data.roomID;
		}
		if(data.mediaURL) {
			document.getElementById('mediaURL').textContent = data.mediaURL;
		}
	})
}

const appendLog = msg => {
	// store new log record
	// chrome.storage.local.get('userLog', data => {
	// 	let logs = data.userLog;
	// 	if(logs) {
	// 		logs.push(msg);
	// 	} else {
	// 		logs = [msg, ];
	// 	}
	// 	chrome.storage.local.set({'userLog': logs}, undefined);
	// })

	// append log to logDiv
	const logDiv = document.getElementById('logDiv');
	const doScroll = logDiv.scrollTop > logDiv.scrollHeight - logDiv.clientHeight - 1;
	const item = document.createElement('div');
	item.className = 'log-record';
	item.innerText = msg;
	logDiv.appendChild(item);
	if(doScroll) {
		logDiv.scrollTop = logDiv.scrollHeight - logDiv.clientHeight;
	}
	
}

const reloadLogs = _ => {
	const logDiv = document.getElementById('logDiv');
	while(logDiv.firstChild) { logDiv.removeChild(logDiv.lastChild) };
	chrome.storage.local.get('userLog', data => {
		let logs = data.userLog;
		if(logs) {
			logs.forEach(log => {
				const item = document.createElement('div');
				item.className = 'log-record';
				item.innerText = log;
				logDiv.appendChild(item);
			})
			// scroll to bottom
			logDiv.scrollTop = logDiv.scrollHeight - logDiv.clientHeight;
		}
	})
}

chrome.runtime.onMessage.addListener(msg => {
	// TODO
	// Logが追加されたタイミングでメッセージを受け取る
	// その時popupが開かれていれば、eventHandlerが呼ばれるので
	// appendLogする appendLogする
	//
	//
	//
	if(msg.type == 'FROM_PAGE') {
		if(msg.command == 'playbackPosition') {
			console.log(msg.data)
			appendLog('playback: ' + msg.data.position);
		}
	}
	if(msg.type == 'FROM_BG') {
		console.log('from background: ', msg.command)
		switch(msg.command) {
			case 'rerenderView': // BackgoundからLog追加のメッセージを受け取る
				renderView();
				break;
			case 'appendLog':
				for(const log of msg.data.logs) {
					appendLog(log);
				}
				break;
			case 'roomInfo':
				// openRoom が成功したときにHostViewに移行する
				chrome.storage.local.set({'status': 'host'}, undefined); //こういう後に響く処理はpopupでやらない
				console.log('room is open: ', msg.data.roomID);
				// document.getElementById('roomId').textContent = 'room ID: ' + msg.data.roomID;

				renderHostView();
				appendLog('Successfully opened room: ' + msg.data.roomID);

				break;
			case 'connectionClosed':
				// connが切れたときにdefaultViewに移行する
				console.log('connection is closed');
				// document.getElementById('log').textContent = 'connection is closed';
				// document.getElementById('roomId').textContent = '';
				// document.getElementById('mediaURL').textContent = '';

				// connCloseしたときはbackground側でstorageをclearするから
				// popup側でstatusを変更することはない
				renderDefaultView();

				break;
			case 'joinSuccess':
				// joinが成功したときにClientViewに移行する
				chrome.storage.local.set({'status': 'client'}, undefined); //こういう後に響く処理はpopupでやらない
				console.log('client successfully joined the room.');
				// document.getElementById('log').textContent = 'successfully joined.';
				// document.getElementById('roomId').textContent = 'room ID(client): ' + msg.data.roomID;
				// document.getElementById('mediaURL').textContent = 'mediaURL: ' + msg.data.mediaURL;

				renderClientView();
				appendLog('Successfully joined the room.')

				break;
		}
	}
})

