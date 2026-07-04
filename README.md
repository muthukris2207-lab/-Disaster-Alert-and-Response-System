# 🚨 Disaster Alert and Response System

A complete full-stack, location-aware, and responsive crisis management platform. Built to facilitate real-time alert broadcasts, shelter tracking, incident crowdsourcing, and volunteer coordination during critical emergencies.

Deployable out-of-the-box on **GitHub** (for version control) and **Vercel** (for static hosting & Node.js serverless functions).

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom design system: crimson, charcoal, glassmorphism), Vanilla JS (ES6+ Modules), Leaflet.js (Dynamic OpenStreetMap mapping).
- **Backend:** Node.js serverless API routes running on Vercel (`/api/*`).
- **Database & Services:** Firebase Firestore (NoSQL database), Firebase Storage (photo attachments), Firebase Cloud Messaging (FCM Topic-based push warning notifications), Firebase Authentication (Email/Password, password reset).
- **Hosting:** Vercel (Client and Serverless functions unified deployment).

---

## 📁 Project Directory Structure

```text
disaster-alert-system/
├── public/                 # Static Frontend Files
│   ├── index.html          # Landing page with live active warning ticker
│   ├── login.html          # Credentials Auth & Recover flow
│   ├── register.html       # Sign up with auto Geolocation extraction
│   ├── dashboard.html      # Localized alerts feed, notification registers
│   ├── emergency.html      # Hotlines directory, nearby shelters tracker, SOS broadcast
│   ├── report.html         # Disaster Incident Reporter, photo upload, coordinates tagging
│   ├── admin.html          # Protected panel: maps, verification queue, broadcast forms
│   ├── css/
│   │   └── style.css       # Custom Responsive Emergency Styling System
│   └── js/
│       └── app.js          # Core App Javascript (Firebase client init & common UI rules)
├── api/                    # Vercel Serverless Functions
│   ├── _db.js              # Server database helper (initializes firebase-admin)
│   ├── config.js           # Dynamic configuration keys serving route
│   ├── alerts.js           # Handles alerts history & Admin publishes (FCM triggers)
│   ├── shelters.js         # Proximity sorting (Haversine distance calculation) & edits
│   ├── reports.js          # Incident submits & Admin verify/reject queue
│   ├── volunteers.js       # Volunteers sign ups and task assignments
│   └── users.js            # User registry accounts list & suspended status changes
├── firebase/
│   └── firebaseConfig.js   # Dynamic Firebase Client SDK initialization
├── firestore.rules         # Security configuration for Firestore Database
├── vercel.json             # Vercel Serverless router and URL rewrites settings
├── package.json            # Dev/Server packages and scripts definition
├── .env.example            # Environment variables configuration blueprint
└── README.md               # User deployment manual
```

---

## 🚀 Setup & Installation Instructions

Follow these steps to configure your Firebase environment and run the application locally or deploy it to production.

### Step 1: Firebase Project Configuration
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. **Authentication:** Enable the **Email/Password** sign-in method in Build -> Authentication.
3. **Cloud Firestore:**
   - Create a database in Firestore.
   - Deploy the rules defined in `firestore.rules` inside the *Rules* tab.
4. **Cloud Storage:** Create a storage bucket. Keep default rules or set read/write permissions for authenticated users.
5. **Firebase Cloud Messaging:** 
   - Go to *Project Settings* -> *Cloud Messaging*.
   - Under *Web configuration*, generate a **Web Push certificates key (VAPID key)**.
6. **Generate Server Service Account Credentials:**
   - Go to *Project Settings* -> *Service Accounts*.
   - Click **Generate new private key** to download the credentials JSON file.

### Step 2: Environment Variables
Create a `.env` file in the root directory (based on `.env.example`) and fill in the details:

```ini
# Frontend client credentials (exposed via /api/config API helper)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA1...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:abcd

# Backend Administrative credentials (from generated private key JSON file)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
# For the private key, replace all actual line breaks with \n in the env variable string
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY-----\n"
```

### Step 3: Run Locally
You can run the full stack locally using Vercel CLI.
1. Install dependencies:
   ```bash
   npm install
   ```
2. Install Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```
3. Run the development server:
   ```bash
   vercel dev
   ```
4. Access the application in your browser at `http://localhost:3000`.

---

## 🌐 Deployment to Vercel

### Option A: Via GitHub (Recommended)
1. Push this codebase to a new repository on your GitHub account.
2. In the [Vercel Dashboard](https://vercel.com/), click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Expand **Environment Variables** and add all variables defined in your `.env` file.
5. Click **Deploy**. Vercel will automatically host the static files in `public/` and expose the endpoints under `api/`.

### Option B: Via Vercel CLI
Execute the following command in the root directory:
```bash
vercel --prod
```
When prompted, log in and add the environment variables in the project settings on the Vercel dashboard.

---

## 🔒 Security Rules Details
The database rules are configured to restrict access securely:
- Users can read/write their own profile in `/users/{userId}`.
- Incident reports, emergency SOS requests, and volunteer applications can be created by any authenticated user.
- Admins can read, update, verify, and reject all incident queue documents.
- Only users with the `'admin'` role defined in `/users/{userId}` are allowed to write alerts in `/alerts` or shelters in `/shelters`.

<!-- Redeploy Trigger: 2026-07-04T19:35:00Z -->

