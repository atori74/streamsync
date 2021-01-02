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
		}
	}
};

const closeConnection = () => {
	console.log('closeConnection was called')
	chrome.runtime.sendMessage({type: 'FROM_BG', command: 'connectionClosed'});
};
