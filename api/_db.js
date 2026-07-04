// Shared Firebase Admin database helper for serverless functions.
const admin = require('firebase-admin');

// Load environment variables locally
require('dotenv').config();

let db;
let auth;
let messaging;
let isConfigured = false;
let configError = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle newlines in Vercel/Render env vars
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  if (projectId && clientEmail && privateKey) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: `https://${projectId}.firebaseio.com`
      });
    }
    db = admin.firestore();
    auth = admin.auth();
    messaging = admin.messaging();
    isConfigured = true;
  } else {
    configError = "Missing Firebase Admin Environment Variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).";
    console.warn(configError);
  }
} catch (error) {
  configError = error.message;
  console.error("Firebase Admin Initialization Error:", error);
}

// Helper to verify ID Token (JWT) sent from frontend Client
async function verifyUser(req) {
  if (!isConfigured) throw new Error("Firebase Admin is not configured on the server.");
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error("Unauthorized: No ID token provided.");
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken; // contains uid, email, role, etc.
  } catch (error) {
    throw new Error("Unauthorized: Invalid ID token.");
  }
}

// Helper to check if verified user is an Admin
async function verifyAdmin(req) {
  const decodedToken = await verifyUser(req);
  
  // Get user role from Firestore to confirm they are indeed an admin
  const userDoc = await db.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new Error("Forbidden: User is not an administrator.");
  }
  
  return decodedToken;
}

module.exports = {
  admin,
  db,
  auth,
  messaging,
  isConfigured,
  configError,
  verifyUser,
  verifyAdmin
};
