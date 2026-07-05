// Core Client-Side Application JS Helper
// Handles Dark Mode, Dynamic Navigation, Firebase SDK Initialization, and FCM token management.

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function toggleTheme() {
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  }
}

// Add Theme Switcher logic after DOM Content loaded
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const switchBtn = document.getElementById('theme-toggle');
  if (switchBtn) {
    switchBtn.addEventListener('click', toggleTheme);
  }
});

// Import Firebase SDK scripts dynamically via CDN (ES Modules style or script injections)
// We use ES Modules imports inside this configuration module
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// Fetch configurations dynamically to avoid keys exposure in source control
import { getFirebaseConfig } from "/firebase/firebaseConfig.js";

let app, auth, db, storage, messaging;

async function initFirebase() {
  try {
    const firebaseConfig = await getFirebaseConfig();
    
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Messaging is optional/conditional since it requires browser permission & service worker support
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.warn("FCM not supported on this browser or origin:", e);
    }
    
    // Bind to window for global access across vanilla JS pages
    window.firebaseApp = app;
    window.auth = auth;
    window.db = db;
    window.storage = storage;
    window.messaging = messaging;
    
    console.log("Firebase initialized successfully.");
    
    // Setup standard Auth Listener & Nav UI Updates
    setupAuthObserver();
    
    return { auth, db, storage, messaging };
  } catch (error) {
    console.error("Firebase SDK Initialization failed:", error);
    showNotification("Firebase configurations are missing or incorrect. Check .env settings.", "error");
    throw error;
  }
}

// Track logged in state and update navbar
function setupAuthObserver() {
  onAuthStateChanged(auth, async (user) => {
    window.currentUser = user;
    updateNavUI(user);
    
    if (user) {
      // Check roles and trigger operations
      const userProfile = await fetchUserProfile(user.uid);
      if (userProfile) {
        window.currentUserProfile = userProfile;
        
        // If current page is login/register, send to dashboard
        const path = window.location.pathname;
        if (path.endsWith('login') || path.endsWith('login.html') || path.endsWith('register') || path.endsWith('register.html')) {
          window.location.href = 'dashboard.html';
        }
        
        // If current page is admin.html, ensure user is indeed an admin
        if (path.endsWith('admin') || path.endsWith('admin.html')) {
          if (userProfile.role !== 'admin') {
            window.location.href = 'dashboard.html';
          }
        }
      }
    } else {
      // Redirect protected routes to login
      const path = window.location.pathname;
      const protectedPaths = ['dashboard', 'dashboard.html', 'admin', 'admin.html', 'report', 'report.html', 'emergency', 'emergency.html'];
      const isProtected = protectedPaths.some(p => path.endsWith(p));
      
      if (isProtected) {
        window.location.href = 'login.html';
      }
    }
  });
}

// Fetch user metadata from Firestore
async function fetchUserProfile(uid) {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (e) {
    console.error("Failed to fetch user profile:", e);
  }
  return null;
}

// Update navbar items dynamically based on user state
function updateNavUI(user) {
  const navContainer = document.getElementById('navbar-links');
  if (!navContainer) return;
  
  let html = `
    <a href="index.html" class="${isActive('index.html')}">Home</a>
    <a href="emergency.html" class="${isActive('emergency.html')}">Emergency Hub</a>
  `;
  
  if (user) {
    html += `
      <a href="dashboard.html" class="${isActive('dashboard.html')}">Dashboard</a>
      <a href="report.html" class="${isActive('report.html')}">Report Incident</a>
    `;
    
    // Check role asynchronously, but prepare UI immediately
    fetchUserProfile(user.uid).then(profile => {
      if (profile && profile.role === 'admin') {
        const adminLinkExists = document.querySelector('a[href="admin.html"]');
        if (!adminLinkExists) {
          const adminLink = document.createElement('a');
          adminLink.href = 'admin.html';
          adminLink.className = isActive('admin.html');
          adminLink.innerText = 'Admin Portal';
          // Insert admin link before logout button or at the end of links
          navContainer.appendChild(adminLink);
        }
      }
    });
    
    html += `
      <button class="btn btn-secondary" id="logout-btn" style="padding: 0.4rem 1rem; font-size: 0.9rem; margin-left: 0.5rem;">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    `;
  } else {
    html += `
      <a href="login.html" class="${isActive('login.html')}">Login</a>
      <a href="register.html" class="${isActive('register.html')}">Register</a>
    `;
  }
  
  navContainer.innerHTML = html;
  
  // Attach logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = 'login.html';
      } catch (err) {
        showNotification("Logout failed: " + err.message, "error");
      }
    });
  }
}

function isActive(path) {
  const currentPath = window.location.pathname;
  if (path === 'index.html' && (currentPath === 'index.html' || currentPath === '/index.html')) return 'active';
  return (currentPath.endsWith(path) || currentPath.endsWith(path + '.html')) ? 'active' : '';
}

// Request notification permission and save FCM token in database
async function setupPushNotifications(user) {
  if (!messaging) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Get FCM token
      // VAPID public key must be provided when registering FCM on client. 
      // User can configure this in Vercel. We supply a standard config fallback.
      const token = await getToken(messaging, { 
        vapidKey: window.FIREBASE_VAPID_KEY || 'BF71K3a9i9zD3o30lUv8k5s8oP6J4uCqR2p5n8i3y7t6e5u4i3o2p1l0m' // User should replace with their VAPID key
      });
      
      if (token) {
        console.log("FCM Token acquired:", token);
        // Save FCM token to user document
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          fcmToken: token,
          updatedAt: new Date()
        });
        
        // Listen to active in-app messages when tab is open
        onMessage(messaging, (payload) => {
          console.log('Message received in foreground: ', payload);
          showInAppAlert(payload.notification.title, payload.notification.body);
        });
      }
    }
  } catch (e) {
    console.warn("FCM Setup failed:", e);
  }
}

// Display in-app notifications
function showInAppAlert(title, message) {
  const container = document.getElementById('in-app-alert-container');
  if (!container) {
    // Dynamically insert alert box on dashboard or user view
    const banner = document.createElement('div');
    banner.className = 'alert-banner';
    banner.style.position = 'fixed';
    banner.style.top = '80px';
    banner.style.right = '20px';
    banner.style.zIndex = '9999';
    banner.style.maxWidth = '380px';
    banner.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.2rem; font-size:0.9rem;">
        <strong style="color:var(--primary-red)"><i class="fas fa-exclamation-triangle"></i> ${title}</strong>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none; border:none; margin-left:1rem; cursor:pointer;"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(banner);
    
    // Audio alert
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch(err) {
      console.warn("Audio Context failed:", err);
    }
  }
}

// Global visual notifications
function showNotification(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '1rem 1.5rem';
  toast.style.borderRadius = 'var(--border-radius-sm)';
  toast.style.color = 'white';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = 'var(--glass-shadow)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '0.5rem';
  toast.style.transition = 'opacity 0.3s ease';
  
  if (type === 'success') {
    toast.style.backgroundColor = 'var(--success)';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  } else if (type === 'error') {
    toast.style.backgroundColor = 'var(--primary-red)';
    toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  } else {
    toast.style.backgroundColor = 'var(--info)';
    toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Export initialization promise so other scripts trigger after firebase is loaded
const firebaseInitPromise = initFirebase();

export { 
  firebaseInitPromise, 
  auth, 
  db, 
  storage, 
  messaging, 
  setupPushNotifications, 
  showNotification,
  showInAppAlert
};
