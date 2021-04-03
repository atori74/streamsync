var YoutubeSync = class {
	constructor() {
		this.state = 'OPEN';
		this.video = document.getElementsByClassName('video-stream html5-main-video')[0];
		this.adInterrupting = false;
		this.isPaused = false;

		this.autoAdSkipIsEnabled = false;
		chrome.storage.local.get('env', data => {
			const env = data.env;
			if(env && env.adSkip == 'true') {
				this.autoAdSkipIsEnabled = true;
			}
		})

		this.initEventListener();

		// イベントリスナーで監視できないDOMはMutationObserverで
		this.adObserver = new MutationObserver(mutations => {
			mutations.forEach(m => {
				// 広告検知
				const _adInterrupting = m.target.classList.contains('ad-interrupting')
				if(this.adInterrupting != _adInterrupting) {
					// 広告が流れ始めた、または終了した状態
					this.adInterrupting = _adInterrupting;

					if(this.adInterrupting) {
						// 広告が流れ始めた
						this.sendMessage('adInterrupted');
						this.sendMessage('paused');
						if(this.autoAdSkipIsEnabled) {
							this.autoAdSkip();
						}
					} else {
						// 広告が終了した
						this.sendMessage('played');
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
		if (this.adInterrupting) {
			return;
		}
		const delta = this.video.currentTime - position;
		if(delta > this.allowedDiff || delta < -1 * this.allowedDiff) {
			this.seekTo(position);
		};
	}

	adSkip() {
		if(this.adInterrupting && this.video.duration) {
			console.log(`ad was skipped`);
			this.video.currentTime = this.video.duration;

			const skipButtons = document.getElementsByClassName('ytp-ad-skip-button');
			if (skipButtons.length > 0) {
				skipButtons[0].click();
			}

			return true;
		}
		return false;
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
		// すでにpause状態または広告が流れている場合はスキップ
		if (this.isPaused || this.adInterrupting) {
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

