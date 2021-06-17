const PrimeVideoCtl = class {
	constructor() {
		this.state = 'OPEN';
		this.video = document.querySelector('.webPlayerElement video');
		this.isPaused = false;

		this.initEventListener();

		this.allowedDiff = 0.5;
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

	getDuration() {
		return this.video.duration;
	}

	play() {
		this.video.play();
	}

	pause() {
		this.video.pause();
	}

	seekTo(position) {
		const isPaused = this.video.paused;
		if(this.video.paused) {
			this.video.pause();
			this.video.currentTime = position;
			this.video.play();
		} else {
			this.video.currentTime = position;
		}
	}

	seekAfter(sec) {
		const isPaused = this.video.paused;
		if(this.video.paused) {
			this.video.pause();
			this.video.currentTime += sec;
			this.video.play();
		} else {
			this.video.currentTime += sec;
		}
	}

	sync(position) {
		if(this.video.paused) {
			return;
		}
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
	syncCtl = new PrimeVideoCtl();
};

const stopSyncCtl = _ => {
	if(syncCtl && syncCtl.state == 'OPEN') {
		console.log("syncCtl is released")
		syncCtl.release();
	}
}

if(/^\/gp\/video\/detail\/.+/.test(document.location.pathname)) {
	const wait = setInterval(_ => {
		if(document.querySelector('.webPlayerElement video')) {
			initializeSyncCtl();
			clearInterval(wait);
		}
	}, 100);
	setTimeout(_ => {
		clearInterval(wait);
	}, 60000);
}


