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
		"chrome.runtime.sendMessage({type: 'FROM_PAGE', command: 'currentTime', data: vid.currentTime}, undefined);",
		"vid.currentTime;"
	]
	return code.join('\n');
}

function getCode(f) {
	let code = f()
	return code
}


