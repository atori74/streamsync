// Initialize Firebase
var firebaseConfig = {
    apiKey: "AIzaSyBQdp65ULUBNLWuQNOtoE4KOlpFdvWfxqg",
    authDomain: "streamsync-cc465.firebaseapp.com",
    databaseURL: "https://streamsync-cc465.firebaseio.com",
    projectId: "streamsync-cc465",
    storageBucket: "streamsync-cc465.appspot.com",
    messagingSenderId: "535392764193",
    appId: "1:535392764193:web:fa3a31fa052d5275a9be60",
    measurementId: "G-P3BKKJSTMR"
};
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

const setMessagingToken = async (vapid) => {
	const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
	const currentToken = await messaging.getToken({
		//'serviceWorkerRegistration': registration,
		'vapidKey': vapid,
	});
	if(currentToken) {
		console.log('got token');
		chrome.storage.local.set({'messagingToken': currentToken}, () => {
			console.log('successful to get messaging token');
		});
	} else {
		console.log('failed to get messaging token');
		chrome.storage.local.remove('messagingToken', undefined);
	}
}

let isScanning = false;

const sleep = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

const ytPostCurrentTime = () => {
	let code = [
		"vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"chrome.runtime.sendMessage({type: 'FROM_PAGE', command: 'currentTime', data: vid.currentTime}, undefined);",
		"vid.currentTime;"
	]
	return code.join('\n');
}

const scanCurrentTime = async tabId => {
	chrome.tabs.onRemoved.addListener((id, removeInfo) => {
		if(tabId == id) {
			console.log('taget tab was removed');
			isScanning = false;
			return;
		}
	})
	while(true) {
		chrome.tabs.get(tabId, tab => {
			if(tab.url.match(new RegExp('youtube.com/watch'))) {
				chrome.tabs.executeScript(
					tab.id,
					{code: ytPostCurrentTime()}
				);
			}
		});
		await sleep(1000);
		if(!isScanning) {
			return;
		}
	}
}

chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function(){
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {hostEquals: 'www.youtube.com'},
				}),
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {hostEquals: 'www.netflix.com'},
				})
			],
			actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});

	chrome.runtime.onMessage.addListener(msg => {
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
		}
		if(msg.type == 'FROM_PAGE') {
			if(msg.command == 'currentTime') {
				console.log(msg.data);
				chrome.storage.local.set({'currentTime': msg.data}, undefined);
			}
		}
		if(msg.type == 'FROM_SW') {
			if(msg.command == 'message') {
				console.log('received message from firebase')
			}
		}
	})

	setMessagingToken('BPXfHSvm-iJShETScasNfgTXgptxO-TWR-qEEiTVSaJqa5yCKM-YPCUSoTExeFk4xC_0qp3dLkHXvL_CoiZk8XE');

	messaging.onMessage(payload => {
		console.log('Firebase message received: ', payload);
	});
	
	//messaging.getToken({'vapidKey': 'BPXfHSvm-iJShETScasNfgTXgptxO-TWR-qEEiTVSaJqa5yCKM-YPCUSoTExeFk4xC_0qp3dLkHXvL_CoiZk8XE'}).then(currentToken => {
	//	console.log('in callback')
	//	if(currentToken) {
	//		chrome.storage.local.set({'messagingToken': currentToken}, () => {
	//			console.log('successful to get token');
	//		})
	//	} else {
	//		console.log('failed to get token');
	//	}
	//})
});

