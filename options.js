const loadVariables = async _ => {
	const list = document.querySelector('div#options-list > dl.kv-list');
	while(list.firstChild) { list.removeChild(list.lastChild) };
	chrome.storage.local.get('env', data => {
		const vars = data.env;
		for (const k in vars) {
			const key = document.createElement('dt');
			key.innerText = k;
			const value = document.createElement('dd');
			value.innerText = vars[k];

			const row = document.createElement('div');
			row.appendChild(key);
			row.appendChild(value);

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
