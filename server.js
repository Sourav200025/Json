const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin safely using separated environment variables
try {
  let credentialConfig;
  
  if (process.env.FB_PRIVATE_KEY && process.env.FB_CLIENT_EMAIL && process.env.FB_PROJECT_ID) {
    // Production Cloud Setup (Render)
    // Automatically repairs corrupted or escaped newline strings from web dashboards
    const formattedPrivateKey = process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    credentialConfig = admin.credential.cert({
      projectId: process.env.FB_PROJECT_ID,
      clientEmail: process.env.FB_CLIENT_EMAIL,
      privateKey: formattedPrivateKey,
    });
    console.log("🔥 Firebase Admin initialized via explicit cloud variables.");
  } else {
    // Local Fallback Setup for your computer
    const serviceAccount = require('./serviceAccountKey.json');
    credentialConfig = admin.credential.cert(serviceAccount);
    console.log("🔥 Firebase Admin initialized via local JSON file.");
  }

  admin.initializeApp({
    credential: credentialConfig
  });
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  process.exit(1);
}

const app = express();

// Middleware Configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API Router
const apiRoutes = require('./api');
app.use('/', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
