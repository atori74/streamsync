const handleFrame = (obj) => {
	// hoge
	if(obj.from == 'server') {
		switch(obj.type) {
			case 'roomInfo':
				// hoge
				let roomId = obj.data.roomID;
				console.log('roomID: ', roomId);
				chrome.runtime.sendMessage({type: 'FROM_BG', command: 'roomInfo', data: {roomID: roomId}}, undefined);
				chrome.storage.local.set({'roomID': roomId}, undefined);
				break;
			case 'joinSuccess':
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
	}
	if(obj.from == 'host') {
		switch(obj.type) {
			case 'playbackPosition':
				let position = obj.data.position;
				let recordedAt = Date.parse(obj.data.currentTime);

				let deltaMilli = Date.now() - recordedAt;
				// TODO: n倍をサイトごとに定数化する
				let delta = deltaMilli * 1000;
				let positionToSeek = position + delta;

				// seek playback
				chrome.storage.local.get(['targetTab', 'mediaURL'], data => {

					chrome.tabs.query({active: true, currentWindow: true}, tabs => {
						if(tabs[0].url.match(new RegExp('^' + data.mediaURL))) {
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
};

const closeConnection = () => {
	console.log('closeConnection was called')
	chrome.runtime.sendMessage({type: 'FROM_BG', command: 'connectionClosed'});
};
