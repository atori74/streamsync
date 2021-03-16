const handleFrame = async (obj) => {
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
				const roomID = obj.data.roomID;
				const mediaURL = obj.data.mediaURL;

				chrome.storage.local.set({
					'roomID': roomID,
					'mediaURL': mediaURL,
				}, undefined);
				chrome.runtime.sendMessage({type: 'FROM_BG', command: 'joinSuccess', data: {
					'roomID': roomID,
					'mediaURL': mediaURL,
				}}, undefined);

				await sleep(1000)

				chrome.tabs.create({active: true, url: mediaURL}, tab => {
					chrome.tabs.onUpdated.addListener(async function f(_tabId, changeInfo, _tab) {
						if(tab.id == _tabId && changeInfo.status == 'complete') {
							// initContentScript(tab.id);
							// storageにtargetTabが登録されるまではseekは発生しない
							chrome.storage.local.set({targetTab: tab.id}, undefined);

							// TODO
							// tabにイベントハンドラーを追加
							// tabが閉じられたらleave
							chrome.tabs.onUpdated.removeListener(f);
						}
					})
				});

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

				// const positionToSeek = position + delta;
				// 時刻補正を無効化
				let positionToSeek = position;

				// seek playback
				chrome.storage.local.get(['targetTab'], data => {
					// ターゲットを現在のアクティブタブにする
					// chrome.tabs.query({active: true, currentWindow: true}, tabs => {
					// 	if (!tabs[0]) {
					// 		console.log('no tab in window');
					// 		return;
					// 	}
					// 	if(tabs[0].url == mediaURL && tabs[0].id == data.targetTab) {
					// 		chrome.tabs.executeScript(
					// 			tabs[0].id,
					// 			{code: `syncCtl.sync(${positionToSeek})`}
					// 		);
					// 	} else {
					// 		console.log("Host's media is not been played in active tab.")
					// 	}
					// });

					// ターゲットをjoinRoomしたときのタブにする
					if(!data.targetTab) {
						return;
					}
					chrome.tabs.get(data.targetTab, tab => {
						if(tab.url == mediaURL) {
							chrome.tabs.executeScript(
								data.targetTab,
								{code: `syncCtl.sync(${positionToSeek})`}
							);
						} else {
							console.log("Host's media is not been played in target tab.")
						}
					});
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
