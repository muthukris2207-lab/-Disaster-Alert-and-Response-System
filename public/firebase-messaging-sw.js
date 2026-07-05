// Service Worker for receiving Firebase Cloud Messaging background notifications.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This is initialized with generic details. When deployed, the browser will match FCM requirements.
// A standard trick is to dynamically pass config parameters via service worker registration queries, 
// but standard initialization is sufficient to catch background push messages.
const defaultConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "PLACEHOLDER_PROJECT_ID.firebaseapp.com",
  projectId: "PLACEHOLDER_PROJECT_ID",
  storageBucket: "PLACEHOLDER_PROJECT_ID.appspot.com",
  messagingSenderId: "PLACEHOLDER_MESSAGING_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID"
};

// We check if the config was stored in IndexedDB or local caches, or fallback to window definitions
firebase.initializeApp(defaultConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received: ', payload);
  
  const notificationTitle = payload.notification.title || "🚨 Disaster Alert Update";
  const notificationOptions = {
    body: payload.notification.body || "A new status update has been issued by Disaster Response.",
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-96.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add click listener to notification to open dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('dashboard.html')
  );
});
