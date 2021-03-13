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
				let position = obj.data.position;
				let recordedAt = Date.parse(obj.data.currentTime);
				let mediaURL = obj.data.mediaURL;

				let deltaMilli = Date.now() - recordedAt;
				// TODO: n倍をサイトごとに定数化する
				let delta = deltaMilli / 1000;
				// let positionToSeek = position + delta;
				// 時刻補正を無効化
				let positionToSeek = position;

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
								{code: ytSeekTo(positionToSeek)}
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
	chrome.runtime.sendMessage({type: 'FROM_BG', command: 'connectionClosed'});
};
