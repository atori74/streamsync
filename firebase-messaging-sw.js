importScripts('https://www.gstatic.com/firebasejs/8.1.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.1.1/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyBQdp65ULUBNLWuQNOtoE4KOlpFdvWfxqg",
    authDomain: "streamsync-cc465.firebaseapp.com",
    databaseURL: "https://streamsync-cc465.firebaseio.com",
    projectId: "streamsync-cc465",
    storageBucket: "streamsync-cc465.appspot.com",
    messagingSenderId: "535392764193",
    appId: "1:535392764193:web:fa3a31fa052d5275a9be60",
    measurementId: "G-P3BKKJSTMR"
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(payload => {
	console.log('[firebase-messaging-sw.js] Received background message ', payload);

	//chrome.runtime.sendMessage({'type': 'FROM_SW', 'command': 'message'}, undefined);

	// Customize notification here
	const notificationTitle = 'Background Message Title';
	const notificationOptions = {
		body: 'Background Message body.',
		icon: '/firebase-logo.png'
	};

	self.registration.showNotification(notificationTitle,notificationOptions);
});
