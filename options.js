const loadVariables = async _ => {
	console.log('reloaded')
	const list = document.querySelector('div#options-list > dl.kv-list');
	while(list.firstChild) { list.removeChild(list.lastChild) };
	chrome.storage.local.get('env', data => {
		const vars = data.env;
		console.log(vars)
		if(Object.keys(vars).length == 0) {
			const key = document.createElement('dt');
			key.innerText = 'no variables';
			const value = document.createElement('dd');
			value.innerText = '';

			const row = document.createElement('div');
			row.appendChild(key);
			row.appendChild(value);

			list.appendChild(row);
		}
		for (const k in vars) {
			const key = document.createElement('dt');
			key.innerText = k;
			const value = document.createElement('dd');
			value.innerText = vars[k];

			const removeBtn = document.createElement('div');
			removeBtn.className = 'kv-list-remove-row';
			const removeImg = document.createElement('img');
			removeImg.src = '/static/delete_black.png'
			removeImg.className = 'remove-img'
			removeBtn.appendChild(removeImg);

			removeBtn.onclick = _ => {
				chrome.storage.local.get('env', data => {
					const vars = data.env;
					delete vars[k];
					chrome.storage.local.set({'env': vars}, undefined);
					loadVariables();
				})
			}

			const row = document.createElement('div');
			row.appendChild(key);
			row.appendChild(value);
			row.appendChild(removeBtn);

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
