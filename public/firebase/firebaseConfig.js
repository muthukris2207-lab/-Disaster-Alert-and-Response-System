// Firebase Client Configuration
// This file initializes the Firebase SDK for the browser client.
// To keep credentials secure and prevent hardcoding, we attempt to fetch them dynamically from /api/config first.
// If the API is unavailable, we fall back to window.firebaseEnv or environment placeholders.

const defaultConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "PLACEHOLDER_AUTH_DOMAIN",
  projectId: "PLACEHOLDER_PROJECT_ID",
  storageBucket: "PLACEHOLDER_STORAGE_BUCKET",
  messagingSenderId: "PLACEHOLDER_MESSAGING_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID"
};

async function getFirebaseConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn("Could not fetch config from /api/config, falling back to local variables:", e);
  }
  
  // Local fallback (populated by user or using window variables)
  return {
    apiKey: window.FIREBASE_API_KEY || defaultConfig.apiKey,
    authDomain: window.FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
    projectId: window.FIREBASE_PROJECT_ID || defaultConfig.projectId,
    storageBucket: window.FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
    appId: window.FIREBASE_APP_ID || defaultConfig.appId
  };
}

export { getFirebaseConfig };
