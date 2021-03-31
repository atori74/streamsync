const createKVRow = (_key, _value, hasRemoveBtn) => {
	const key = document.createElement('dt');
	key.innerText = _key;
	const value = document.createElement('dd');
	value.innerText = _value;

	if (hasRemoveBtn) {
		const removeBtn = document.createElement('div');
		removeBtn.className = 'kv-list-remove-row';
		const removeImg = document.createElement('img');
		removeImg.src = '/static/delete_black.png'
		removeImg.className = 'remove-img'
		removeBtn.appendChild(removeImg);

		removeBtn.onclick = _ => {
			chrome.storage.local.get('env', data => {
				const vars = data.env;
				delete vars[_key];
				chrome.storage.local.set({'env': vars}, loadVariables);
			})
		}
	}

	const row = document.createElement('div');
	row.appendChild(key);
	row.appendChild(value);
	row.appendChild(removeBtn);

	return row;
}


const loadVariables = async _ => {
	console.log('reloaded')

	const list = document.querySelector('div#options-list > dl.kv-list');
	while(list.firstChild) { list.removeChild(list.lastChild) };

	chrome.storage.local.get('env', data => {
		const vars = data.env;
		console.log(vars)
		// 保存されている環境変数が無い場合
		if(Object.keys(vars).length == 0) {
			const row = createKVRow('no variables', '', undefined);
			list.appendChild(row);
		}
		for (const k in vars) {
			const row = createKVRow(k, vars[k], true);
			list.appendChild(row);
		}
	})
}

window.onload = _ => {
	document.getElementById('register-env-var').onclick = _ => {
		const key = document.getElementById('input-key')
		const val = document.getElementById('input-value')

		if(!(key.value && val.value)) {
			alert('key or value is empty!')
			return
		}

		chrome.storage.local.get('env', data => {
			let vars = data.env;
			if(!vars) {
				vars = {}
			}
			vars[key.value] = val.value;
			chrome.storage.local.set({'env': vars}, loadVariables);
			key.value = '';
			val.value = '';
		});
	};

	loadVariables();
}
