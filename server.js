require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Initialize the OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Define the scopes (permissions) your app needs. 
// This example uses Google Drive read-only access.
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// 2. Route: Generate Google Login URL
app.get('/auth', (req, res) => {
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests a Refresh Token
    prompt: 'consent',      // Forces the consent screen to ensure refresh token is provided
    scope: SCOPES,
  });
  
  // Redirect the user to Google's login page
  res.redirect(authorizationUrl);
});

// 3. Route: Handle the Google Callback
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query; // Google sends an authorization code in the URL
  
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    // Exchange the authorization code for access and refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Set the credentials for the Google API client
    oauth2Client.setCredentials(tokens);
    
    // Note: In a production app, you should save these tokens to a database 
    // associated with the logged-in user so you don't force them to log in every time.
    console.log('Tokens acquired:', tokens);

    res.send(`
      <h1>Authentication Successful!</h1>
      <p>Your app is now connected to Google.</p>
      <a href="/api/drive">Click here to test a Google Drive API Call</a>
    `);
  } catch (error) {
    console.error('Error retrieving access token:', error);
    res.status(500).send('Authentication failed');
  }
});

// 4. Route: Make an Authenticated API Request
app.get('/api/drive', async (req, res) => {
  try {
    // Initialize the Drive API v3, passing the authenticated oauth2Client
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Call the API: List the 10 most recently modified files
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name, mimeType)',
    });
    
    const files = response.data.files;
    
    if (files.length === 0) {
      res.send('No files found.');
    } else {
      res.json({
        message: 'API Call Successful!',
        files: files
      });
    }
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).send('Failed to fetch data from Google APIs. Make sure you authenticated via /auth first.');
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server is running!`);
  console.log(`Step 1: Go to http://localhost:${PORT}/auth to log in.`);
});
