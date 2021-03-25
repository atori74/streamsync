const setStorage = (key, obj) => {
	chrome.storage.local.get(key, data => {
		let src = data[key];
		const result = deepmerge(src, obj);
		const toSet = {};
		toSet[key] = result;
		chrome.storage.local.set(toSet, undefined);
	})
}

const clearStorage = key => {
	chrome.storage.local.remove(key, undefined);
}

