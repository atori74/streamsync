const handleFrame = async (frame) => {
	// hoge
	if(frame.from == 'server') {
		switch(frame.type) {
			case 'roomInfo': {
				// hoge
				console.log('Received roomInfo from the server.')
				let roomId = frame.data.roomID;
				await setStorage('session', {'roomID': roomId, 'status': 'host'});
				rerenderPopup('Successfully opened room: ' + roomId);
				break;
			}
			case 'joinSuccess': {
				const roomID = frame.data.roomID;
				const mediaURL = frame.data.mediaURL;

				await setStorage('session', {
					'roomID': roomID,
					'mediaURL': mediaURL,
					'status': 'client',
				}, undefined);
				rerenderPopup('Successfully joined the room.');

				await sleep(1000)

				chrome.tabs.create({active: true, url: mediaURL}, tab => {
					chrome.tabs.onUpdated.addListener(async function f(_tabId, changeInfo, _tab) {
						if(tab.id == _tabId && changeInfo.status == 'complete') {
							// initContentScript(tab.id);
							// storageにtargetTabが登録されるまではseekは発生しない
							setStorage('session', {targetTab: tab.id});

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
				const position = frame.data.position;
				const recordedAt = Date.parse(frame.data.currentTime);
				const mediaURL = frame.data.mediaURL;

				// 通信にかかったラグの分、seekする時間を後ろ倒す
				const deltaMilli = Date.now() - recordedAt;
				// TODO: n倍をサイトごとに定数化する
				const delta = deltaMilli / 1000;

				// const positionToSeek = position + delta;
				// 時刻補正を無効化
				let positionToSeek = position;

				// seek playback
				chrome.storage.local.get('session', s => {
					const data = s.session;

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
	if(frame.from == 'host') {
		if(frame.type == 'command') {
			switch(frame.data.command) {
				case 'pause': {
					console.log('Received pause message')
					const position = frame.data.position;

					const [targetTab, err] = await getStorage(['session', 'targetTab']);
					if(err || !session.targetTab) {
						return;
					}
					chrome.tabs.executeScript(
						targetTab,
						{code: `syncCtl.pause(); syncCtl.sync(${position});`}
					);

					break;
				}
				case 'play': {
					console.log('Received play message')

					const [targetTab, err] = await getStorage(['session', 'targetTab']);
					if(err || !targetTab) {
						return;
					}
					chrome.tabs.executeScript(
						targetTab,
						{code: `syncCtl.play();`}
					);

					break;
				}
			}
			return;
		}
	}
};

const closeConnection = async () => {
	console.log('closeConnection was called')
	chrome.storage.local.get('session', s => {
		const data = s.session;
		chrome.tabs.executeScript(
			data.targetTab,
			{code: 'syncCtl.release();'}
		);
	})
	await clearStorage('session');
	rerenderPopup('Connection closed.')
};
