function ytPlay() {
	let code = [
		"var vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"vid.play()"
	];
	return code.join('\n');
}

function ytPause() {
	let code = [
		"var vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"vid.pause()"
	];
	return code.join('\n');
}

function ytFastForward() {
	let code = [
		"var vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"vid.currentTime += 10;"
	]
	return code.join('\n');
}

function ytBackTen() {
	let code = [
		"var vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"vid.currentTime -= 10;"
	]
	return code.join('\n');
}

function ytGetCurrentTime() {
	let code = [
		"var vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"console.log(vid.currentTime);"
	]
	return code.join('\n');
}

function ytPostCurrentTime() {
	let code = [
		"vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"chrome.runtime.sendMessage({type: 'FROM_PAGE', command: 'playbackPosition', data: {position: vid.currentTime, currentTime: (new Date()).toISOString()}}, undefined);",
		"vid.currentTime;"
	]
	return code.join('\n');
}

function ytSeekTo(position) {
	let code = [
		"var vid = document.getElementsByClassName('video-stream html5-main-video')[0];",
		"var delta = vid.currentTime - " + position + ";",
		"var allowedDiff = 0.5;",
		"if(delta > allowedDiff || delta < -1 * allowedDiff) {",
		"    vid.currentTime = " + position + ';',
		"}"
	]
	return code.join('\n');
}

function getCode(f) {
	let code = f()
	return code
}

// roomを開いたときに最初に呼ぶ
// 必要な関数とかを定義しておく
const initContentScript = tabId => {
	chrome.tabs.get(tabId, tab => {
		if(tab.url.match(new RegExp('youtube.com/watch'))) {
			chrome.tabs.executeScript(
				tab.id,
				{file: 'controller.js'},
			);
		}
	});
}
