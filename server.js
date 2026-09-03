require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');

// ==========================================
// 1. FIREBASE ADMIN INITIALIZATION
// ==========================================
// This MUST happen before we require your 'api.js' router so that 
// the database (db = admin.firestore()) connects successfully.
try {
  if (!admin.apps.length) {
    // Note: Render uses environment variables for credentials. 
    // If you have a serviceAccountKey.json file, you would load it like this:
    // const serviceAccount = require('./serviceAccountKey.json');
    // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    
    // Standard initialization (assumes GOOGLE_APPLICATION_CREDENTIALS is set)
    admin.initializeApp();
    console.log("🔥 Firebase Admin connected successfully.");
  }
} catch (error) {
  console.error("❌ Firebase Admin Initialization Error:", error.message);
}

// ==========================================
// 2. EXPRESS APP SETUP
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to handle JSON and URL-encoded data requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tell Express to serve static files from the current directory
app.use(express.static(__dirname));

// ==========================================
// 3. FRONTEND ROUTE (UI)
// ==========================================
// 🚨 This sends your Frosted Aurora UI when someone visits your main link.
// URL: https://api-nddg.onrender.com/
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 4. BACKEND API ROUTES
// ==========================================
// Import the api.js file we fixed in the previous step
const apiRoutes = require('./api'); 

// Mount the API routes to the server.
// Because the HTML file claims the '/' route above, you MUST use your 
// explicit endpoints for making API calls. 
//
// Examples of your live endpoints:
// 👉 Payment: https://api-nddg.onrender.com/api-pay?token=...&paytoNumber=...&amount=...
// 👉 Balance: https://api-nddg.onrender.com/balance?token=...
// 👉 Verify:  https://api-nddg.onrender.com/verify?token=...&number=...
app.use('/', apiRoutes);

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
