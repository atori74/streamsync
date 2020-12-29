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
	})
});

