const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin globally at application startup
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("🔥 Firebase Admin initialized successfully.");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  process.exit(1); // Stop the server if credentials are bad
}

const app = express();

// 2. Middleware Configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Register API Router
const apiRoutes = require('./api');
app.use('/', apiRoutes); // Routes will be available at root /api-pay, /balance, etc.

// 4. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
