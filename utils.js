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

