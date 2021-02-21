const handleFrame = (obj) => {
	// hoge
	if(obj.from == 'server') {
		switch(obj.type) {
			case 'roomInfo': {
				// hoge
				let roomId = obj.data.roomID;
				console.log('roomID: ', roomId);
				chrome.runtime.sendMessage({type: 'FROM_BG', command: 'roomInfo', data: {roomID: roomId}}, undefined);
				chrome.storage.local.set({'roomID': roomId}, undefined);
				break;
			}
			case 'joinSuccess': {
				let roomID = obj.data.roomID;
				let mediaURL = obj.data.mediaURL;

				chrome.storage.local.set({
					'roomID': roomID,
					'mediaURL': mediaURL,
				}, undefined);
				chrome.runtime.sendMessage({type: 'FROM_BG', command: 'joinSuccess', data: {
					'roomID': roomID,
					'mediaURL': mediaURL,
				}}, undefined);
				break;
			}
			case 'playbackPosition': {
				const position = obj.data.position;
				const recordedAt = Date.parse(obj.data.currentTime);
				const mediaURL = obj.data.mediaURL;

				// 通信にかかったラグの分、seekする時間を後ろ倒す
				const deltaMilli = Date.now() - recordedAt;
				// TODO: n倍をサイトごとに定数化する
				const delta = deltaMilli / 1000;
				const positionToSeek = position + delta;

				// seek playback
				chrome.storage.local.get(['targetTab'], data => {
					chrome.tabs.query({active: true, currentWindow: true}, tabs => {
						if (!tabs[0]) {
							console.log('no tab in window');
							return;
						}
						if(tabs[0].url == mediaURL) {
							chrome.tabs.executeScript(
								tabs[0].id,
								{code: `syncCtl.sync(${positionToSeek})`}
							);
						} else {
							console.log("Host's media is not been played in active tab.")
						}
					});

					// ターゲットをjoinRoomしたときのタブにするか、現在のアクティブタブにするか
					//
					// chrome.tabs.get(data.targetTab, tab => {
					// 	if(tab.url.match(new RegExp('^' + data.mediaURL))) {
					// 		chrome.tabs.executeScript(targetID, {
					// 			code: ytSeekTo(positionToSeek),
					// 		});
					// 	} else {
					// 		console.log("Host's media is not been played in target tab.")
					// 	}
					// });

				})
				break;
			}
		}
	}
	if(obj.from == 'host') {
		switch(obj.type) {
			default:
				// hoge
		}
	}
};

const closeConnection = () => {
	console.log('closeConnection was called')
	chrome.storage.local.get(['targetTab'], data => {
		chrome.tabs.executeScript(
			data.targetTab,
			{code: 'syncCtl.release();'}
		);
	})
	chrome.storage.local.clear(undefined);
	chrome.runtime.sendMessage({type: 'FROM_BG', command: 'connectionClosed'});
};
