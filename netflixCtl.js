const NetflixCtl = class {
	constructor() {
		this.state = 'OPEN';
		this.video = document.querySelector('video');
		this.initPlayer();
		this.isPaused = false;

		this.initEventListener();

		this.allowedDiff = 0.5;
	}

	injectScript(f, args) {
		const actualcode = '(' + f + ')(' + (args ? JSON.stringify(args) : '') + ')';
		let script = document.createElement('script');
		script.textContent = actualcode;
		(document.head || document.documentElement).appendChild(script);
		script.remove();
	}

	initEventListener() {
		// Arrow Function では定義時点のthisが保存されるのでthisを別名変数にする必要なし
		this.playedHandler = _ => {
			if (this.isPaused) {
				this.isPaused = false;
				this.sendMessage('played');
			}
		};
		this.pausedHandler = _ => {
			return;
		};
		this.seekedHandler = _ => {
			return;
		};

		this.video.addEventListener('play', this.playedHandler);
		this.video.addEventListener('pause', this.pausedHandler);
		this.video.addEventListener('seeked', this.seekedHandler);
	}

	clearEventListener() {
		this.video.removeEventListener('play', this.playedHandler);
		this.video.removeEventListener('pause', this.pausedHandler);
		this.video.removeEventListener('seeked', this.seekedHandler);
	}

	initPlayer() {
		this.injectScript(_ => {
			player = netflix.appContext.state.playerApp.getAPI().videoPlayer;
			sessionId = player.getAllPlayerSessionIds()[0];
			video = player.getVideoPlayerBySessionId(sessionId);
		}, undefined);
	}

	getDuration() {
		return this.video.duration;
	}

	play() {
		this.injectScript(_ => {
			video.play();
		}, undefined);
	}

	pause() {
		this.injectScript(_ => {
			video.pause();
		}, undefined);
	}

	seekTo(position) {
		this.injectScript(p => {
			video.seek(p);
		}, position);
	}

	seekAfter(sec) { 
		this.injectScript(sec => {
			video.seek(video.getCurrentTime() + sec * 1000);
		}, sec);
	}

	sync(position) {
		const delta = this.video.currentTime - position;
		if(delta > this.allowedDiff || delta < -1 * this.allowedDiff) {
			this.seekTo(position);
		};
	}

	sendPlaybackPosition() {
		// すでにpause状態または広告が流れている場合はスキップ
		if (this.isPaused) {
			return;
		}
		// pauseを検知した場合はpauseコマンドをclientsに送信
		if (!this.isPaused && this.video.paused) {
			this.isPaused = true;
			this.sendMessage('paused');
		}
		this.sendMessage('playbackPosition');
	}

	sendMessage(command) {
		chrome.runtime.sendMessage({
			type: 'FROM_PAGE',
			command: command,
			data: {
				position: this.video.currentTime,
				currentTime: (new Date()).toISOString(),
				mediaURL: document.URL,
			},
		}, undefined);
	}

	release() {
		this.clearEventListener();
		this.state = 'CLOSED';
	}

	async sleep(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		})
	}
}

let syncCtl;

console.log("content scripts was loaded");

const initializeSyncCtl = _ => {
	console.log("syncCtl is initialized")
	syncCtl = new NetflixCtl();
};

const stopSyncCtl = _ => {
	if(syncCtl && syncCtl.state == 'OPEN') {
		console.log("syncCtl is released")
		syncCtl.release();
	}
}

(_ => {
	const actualcode = 'let player, sessionId, video;';
	let script = document.createElement('script');
	script.textContent = actualcode;
	(document.head || document.documentElement).appendChild(script);
})();

if(/^\/watch/.test(document.location.pathname)) {
	const wait = setInterval(_ => {
		if(document.querySelector('video')) {
			initializeSyncCtl();
			clearInterval(wait);
		}
	}, 100);
	setTimeout(_ => {
		clearInterval(wait);
	}, 60000);
}

window.addEventListener('unload', stopSyncCtl);
