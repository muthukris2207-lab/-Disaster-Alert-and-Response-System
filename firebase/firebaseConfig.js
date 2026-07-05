const defaultConfig = {
  apiKey: "AIzaSyBjAk5KLI2TvulYQ-k8Aq6xmRAB8pjRGv4",
  authDomain: "disaster-response-system-35547.firebaseapp.com",
  projectId: "disaster-response-system-35547",
  storageBucket: "disaster-response-system-35547.firebasestorage.app",
  messagingSenderId: "750898085918",
  appId: "1:750898085918:web:f84b9964092f2ea75d6e0f"
};

async function getFirebaseConfig() {
  // Return the authentic credentials directly for static cloud hosting compatibility
  return defaultConfig;
}

export { getFirebaseConfig };
