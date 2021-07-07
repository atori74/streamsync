const PrimeVideoCtl = class {
	constructor() {
		this.state = 'OPEN';
		this.video = document.querySelector('.webPlayerElement video[src]');
		this.isPaused = false;

		this.initOffset();
		this.initEventListener();

		this.getTitleData();
		if(this.isSeason()) {
			this.getEpisodeData();
			this.episodeId = this.currentEpisodeId();
			const checkEpisode = setInterval(_ => {
				const newer = this.currentEpisodeId();
				if(newer && this.episodeId != newer) {
					clearInterval(checkEpisode);
					this.sendMessage('episodeChange')
					stopSyncCtl();
					initializeSyncCtl();
				}
			}, 100);
		}

		this.allowedDiff = 0.5;
	}

	isSeason() {
		return this.titleData[Object.keys(this.titleData)[0]].titleType == "season";
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

	initOffset() {
		chrome.storage.local.get('session', data => {
			const offset = data.session.offset;
			this.offset = offset ? offset : 0;
		})
		chrome.storage.onChanged.addListener((changes, areaName) => {
			if(areaName != 'local' || !changes.session) {
				return;
			}
			const offset = changes.session.newValue.offset;
			if(offset && offset != this.offset) {
				this.offset = offset;
			}
		})
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
		if(this.video.played.length == 0) {
			return;
		}
		position -= this.offset; // offset秒遅らせる
		const delta = this.video.currentTime - position;
		if(delta > this.allowedDiff || delta < -1 * this.allowedDiff) {
			this.seekTo(position);
		};
	}

	getTitleData() {
		const elems = document.querySelectorAll('script[type="text/template"]');
		const parsed = JSON.parse(elems[elems.length-1].innerText);
		this.titleData = parsed.props.state.detail.btfMoreDetails;
	}

	getEpisodeData() {
		if(!this.isSeason()) {
			return;
		}
		const elems = document.querySelectorAll('script[type="text/template"]');
		const parsed = JSON.parse(elems[elems.length-1].innerText);
		this.episodesData = parsed.props.state.detail.detail;
	}

	currentEpisodeId() {
		if(!this.isSeason()) {
			return;
		}
		if(!this.isFullscreen()) {
			return undefined;
		}
		const titleElem = document.querySelector('div.contentTitlePanel');
		for(const k of Object.keys(this.episodesData)) {
			if(this.episodesData[k].parentTitle == titleElem.querySelector('.title').innerText
				&& titleElem.querySelector('.subtitle').innerText.includes(this.episodesData[k].title)) {
				return `#av-ep-episodes-${this.episodesData[k].episodeNumber - 1}`;
			}
		}
		return undefined;
	}

	changeEpisode(episodeId) {
		if(!this.isSeason()) {
			return;
		}
		if(this.isFullscreen()) {
			this.closePlayer();
		}
		const epi = document.querySelector(episodeId)
		if (!epi) {
			return;
		}
		epi.querySelector('div.dv-episode-playback-title a').click();
		stopSyncCtl();
		initializeSyncCtl();
	}

	isFullscreen() {
		return document.querySelector('#dv-web-player').classList.contains('dv-player-fullscreen');
	}

	closePlayer() {
		document.querySelector('.closeButtonWrapper .imageButton').click();
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
				episodeId: this.episodeId,
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


