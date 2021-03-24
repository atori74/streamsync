var YoutubeSync = class {
	constructor() {
		this.state = 'OPEN';
		this.video = document.getElementsByClassName('video-stream html5-main-video')[0];
		this.adInterrupting = false;
		this.autoAdSkipIsEnabled = true;

		this.initEventListener();

		// イベントリスナーで監視できないDOMはMutationObserverで
		this.adObserver = new MutationObserver(mutations => {
			mutations.forEach(m => {
				// 広告検知
				const _adInterrupting = m.target.classList.contains('ad-interrupting')
				if(this.adInterrupting != _adInterrupting) {
					this.adInterrupting = _adInterrupting;

					if(this.adInterrupting) {
						this.sendMessage('adInterrupted')
						if(this.autoAdSkipIsEnabled) {
							this.autoAdSkip();
						}
					}
				}
			})
		});
		this.observeVideo();

		this.allowedDiff = 0.5;
	}

	initEventListener() {
		// Arrow Function では定義時点のthisが保存されるのでthisを別名変数にする必要なし
		this.playedHandler = _ => {
			this.sendMessage('played')
		};
		this.pausedHandler = _ => {
			this.sendMessage('paused')
		};
		this.seekedHandler = _ => {
			this.sendMessage('seeked')
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

	observeVideo() {
		const target = document.getElementsByClassName('html5-video-player')[0];
		this.adObserver.observe(target, {
			attributes: true,
			attributeOldValue: true,
			attributeFilter: ['class',],
		});
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
		this.video.currentTime = position;
	}

	seekAfter(sec) {
		this.video.currentTime += sec;
	}

	sync(position) {
		const delta = this.video.currentTime - position;
		if(delta > this.allowedDiff || delta < -1 * this.allowedDiff) {
			this.seekTo(position);
		};
	}

	adSkip() {
		if(this.adInterrupting && this.video.duration) {
			console.log(`ad was skipped`);
			this.video.currentTime = this.video.duration;
			return true;
		}
		return false;
		// const skipButton = document.getElementsByClassName('ytp-ad-skip-button')[0];
		// skipButton.click();
	}

	async autoAdSkip() {
		while(true) {
			if(!this.adInterrupting) {
				return;
			}

			this.adSkip();
			await this.sleep(1000);
		}
	}

	sendPlaybackPosition() {
		this.sendMessage('playbackPosition');
	}

	sendMessage(command) {
		// console.log({
		// 	type: 'FROM_PAGE',
		// 	command: command,
		// 	data: {position: this.video.currentTime, currentTime: (new Date()).toISOString()}
		// })
		chrome.runtime.sendMessage({
			type: 'FROM_PAGE',
			command: command,
			data: {position: this.video.currentTime, currentTime: (new Date()).toISOString()}
		}, undefined);
	}

	release() {
		this.adObserver.disconnect();
		this.clearEventListener();
		this.state = 'CLOSED';
	}

	async sleep(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		})
	}
}

var syncCtl = new YoutubeSync();

