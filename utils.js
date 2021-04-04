const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray

const setStorage = async (key, obj) => {
	// storage.getおよびsetを同期的に処理するためPromiseでラップする
	return new Promise(resolve => {
		chrome.storage.local.get(key, data => {
			let src = data[key];
			const result = deepmerge(src, obj, {arrayMerge: overwriteMerge});
			const toSet = {};
			toSet[key] = result;
			chrome.storage.local.set(toSet, resolve);
		})
	})
}

const clearStorage = async key => {
	return new Promise(resolve => {
		const toSet = {};
		toSet[key] = {};
		chrome.storage.local.set(toSet, resolve);
	})
}


// return (value, error)
const getStorage = async (keys) => {
	return new Promise(resolve => {
		try {
			if(!keys) {
				resolve([undefined, new Error('keys are empty')]);
			}
			chrome.storage.local.get(data => {
				const result = keys.reduce((acc, key) => acc[key], data)
				resolve([result, undefined]);
			})
		} catch(err) {
			resolve([undefined, err]);
		}
	})
}

// The MIT License (MIT)
// Copyright (c) 2016 Emma Kuo
// https://opensource.org/licenses/mit-license.php
//
// await acquire()
// まずtaskが作られる taskはrelease()をもつオブジェクト
// taskがキューに入る
// sched()（キューのポーリング処理）を呼ぶ
// sched()では、資源が1以上あればキューからtaskを取り出してreleaseを返す(aquireをresolveする)
// schedでキューからポーリングされたタイミングで初めてacquireがresolveされる
// 資源が0の場合は、スキップされる
// ユーザーからrelease()が呼ばれると、semaphore++してschedを呼ぶ
// これにより次のキューから次のtaskがポーリングされる
class Semaphore {
	constructor(count) {
		this.tasks = [];
		this.count = count;
	}

	sched() {
		if (this.count > 0 && this.tasks.length > 0) {
			this.count--;
			const next = this.tasks.shift();
			if (next === undefined) {
				throw "Unexpected undefined value in tasks list";
			}

			next();
		}
	}

	acquire() {
		return new Promise(resolve => {
			const task = _ => {
				let released = false;
				resolve(_ => {
					if (!released) {
						released = true;
						this.count++;
						this.sched();
					}
				});
			};
			this.tasks.push(task);
			setTimeout(this.sched.bind(this), 0);
		})
	}
}

class Mutex extends Semaphore {
	constructor() {
		super(1);
	}
}

