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
				let currentTime = new Date(Date.parse(obj.data.currentTime));

				// seek playback
				break;
		}
	}
};

const closeConnection = () => {
	console.log('closeConnection was called')
	chrome.runtime.sendMessage({type: 'FROM_BG', command: 'connectionClosed'});
};
