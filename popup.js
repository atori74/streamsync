// let playButton = document.getElementById('play')
// let pauseButton = document.getElementById('pause')
// let fastForward = document.getElementById('fastForward')
// let backTen = document.getElementById('backTen')
// let toggleScan = document.getElementById('toggleScan')
// let getPPButton = document.getElementById('getPBPosition')

window.onload = () => {
	chrome.storage.local.get(['roomID', 'mediaURL'], data => {
		if(data.roomID) {
			document.getElementById('roomId').textContent = 'room ID: ' + data.roomID;
		}
		if(data.mediaURL) {
			document.getElementById('mediaURL').textContent = 'mediaURL: ' + data.mediaURL;
		}
	})
}

chrome.runtime.onMessage.addListener(function(msg) {
	if(msg.type == 'FROM_PAGE') {
		if(msg.command == 'playbackPosition') {
			console.log(msg.data)
			document.getElementById('playbackPosition').textContent = msg.data;
		}
	}
	if(msg.type == 'FROM_BG') {
		console.log('from background: ', msg.command)
		switch(msg.command) {
			case 'roomInfo':
				// hoge
				console.log('room is open: ', msg.data.roomID);
				document.getElementById('roomId').textContent = 'room ID: ' + msg.data.roomID;
				break;
			case 'connectionClosed':
				// hoge
				console.log('connection is closed');
				document.getElementById('log').textContent = 'connection is closed';
				document.getElementById('roomId').textContent = '';
				document.getElementById('mediaURL').textContent = '';

				break;
			case 'joinSuccess':
				console.log('client successfully joined the room.');
				// document.getElementById('log').textContent = 'successfully joined.';
				// document.getElementById('roomId').textContent = 'room ID(client): ' + msg.data.roomID;
				// document.getElementById('mediaURL').textContent = 'mediaURL: ' + msg.data.mediaURL;
				break;
		}
	}
})


// playButton.onclick = function(elem) {
// 	console.log("play");
// 	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
// 		console.log('url: ' + tabs[0].url)
// 		if(tabs[0].url.match(new RegExp('youtube.com/watch'))) {
// 			console.log('this is youtube!')
// 			chrome.tabs.executeScript(
// 				tabs[0].id,
// 				{code: ytPlay()}
// 			);
// 		}
// 	});
// }
// 
// pauseButton.onclick = function(elem) {
// 	console.log("pause");
// 	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
// 		console.log('url: ' + tabs[0].url)
// 		if(tabs[0].url.match(new RegExp('youtube.com/watch'))) {
// 			console.log('this is youtube!')
// 			chrome.tabs.executeScript(
// 				tabs[0].id,
// 				{code: ytPause()}
// 			);
// 		}
// 	});
// }
// 
// fastForward.onclick = function(elem) {
// 	console.log("fast foward");
// 	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
// 		console.log('url: ' + tabs[0].url)
// 		if(tabs[0].url.match(new RegExp('youtube.com/watch'))) {
// 			console.log('this is youtube!')
// 			console.log(ytFastForward())
// 			chrome.tabs.executeScript(
// 				tabs[0].id,
// 				{code: ytFastForward()}
// 			);
// 		}
// 	});
// }
// 
// backTen.onclick = function(elem) {
// 	console.log("back 10sec");
// 	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
// 		console.log('url: ' + tabs[0].url)
// 		if(tabs[0].url.match(new RegExp('youtube.com/watch'))) {
// 			console.log('this is youtube!')
// 			chrome.tabs.executeScript(
// 				tabs[0].id,
// 				{code: ytBackTen()}
// 			);
// 		}
// 	});
// }
// 
// toggleScan.onclick = function(elem) {
// 	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
// 		if(tabs[0].url.match(new RegExp('youtube.com/watch'))) {
// 			chrome.runtime.sendMessage({
// 				'type': 'FROM_ACTION',
// 				'command': 'toggleScan',
// 				'data': {tabId: tabs[0].id}
// 			}, undefined);
// 		}
// 	});
// }
// 
// getPPButton.onclick = elem => {
// 	chrome.storage.local.get('pbPosition', data => {
// 		document.getElementById('playbackPosition').textContent = data.pbPosition;
// 	})
// }

