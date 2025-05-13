require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const app = express();
app.use(cors());
app.use(express.json());

// ✅ LinkedIn OAuth Config
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://linkedinbackend-ndvv.onrender.com/linkedin/callback'; // Update if deployed

// ✅ Configure your app's custom URL scheme here
const IOS_APP_SCHEME = 'myapp'; // Change this to your app's registered URL scheme

// ✅ JWKS client for LinkedIn public key verification
const client = jwksClient({
  jwksUri: 'https://www.linkedin.com/oauth/openid/jwks',
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
};

app.get('/linkedin/callback', async (req, res) => {
  console.log("🔹 Callback URL hit");
  const { code, error, error_description } = req.query;
  
  if (error) {
    console.error("❌ LinkedIn Error:", error, error_description);
    return res.status(400).json({ error, error_description });
  }
  
  if (!code) {
    console.error("❌ Authorization code missing");
    return res.status(400).json({ error: "Authorization code missing" });
  }
  
  console.log("✅ Authorization Code Received:", code);
  
  try {
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    
    const { id_token, access_token } = tokenResponse.data;
    console.log("✅ Token Response:", tokenResponse.data);
    
    jwt.verify(id_token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        console.error("❌ Invalid ID token:", err);
        return res.status(400).json({ error: "Invalid ID token" });
      }
      
      console.log("🔹 Decoded Token:", decoded);
      
      const userData = {
        email: decoded.email,
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        picture: decoded.picture,
        exp: decoded.exp,
        aud: decoded.aud
      };
      
      const encodedUserData = encodeURIComponent(JSON.stringify(userData));
      
      // ✅ Detect device type from User-Agent header
      const userAgent = req.headers['user-agent'] || '';
      const isIOS = /iphone|ipad|ipod/i.test(userAgent);
      
      if (isIOS) {
        // ✅ iOS-specific handling with Universal Links and fallback
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Redirecting...</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; text-align: center; }
              .button { background-color: #0A66C2; color: white; padding: 12px 20px; border-radius: 24px; 
                        text-decoration: none; display: inline-block; margin-top: 20px; font-weight: bold; }
            </style>
            <script>
              // Store data for manual return
              localStorage.setItem('linkedInUserData', '${encodedUserData}');
              
              // Try deep link first
              function openApp() {
                window.location.href = "${IOS_APP_SCHEME}://linkedin/callback?user=${encodedUserData}";
                
                // Set a timeout to detect if app didn't open
                setTimeout(function() {
                  document.getElementById('manual-return').style.display = 'block';
                }, 2000);
              }
              
              // Try opening app when page loads
              window.onload = openApp;
            </script>
          </head>
          <body>
            <h2>LinkedIn Sign-In Successful!</h2>
            <p>Attempting to return to the app...</p>
            
            <div id="manual-return" style="display:none">
              <p>If you're not automatically returned to the app, please tap the button below:</p>
              <a href="${IOS_APP_SCHEME}://linkedin/callback?user=${encodedUserData}" class="button">Return to App</a>
              
              <div style="margin-top: 30px;">
                <p>If the button doesn't work, please open the app manually.</p>
                <p style="font-size: 14px; color: #555;">The app will retrieve your sign-in information automatically.</p>
              </div>
            </div>
          </body>
          </html>
        `);
      } else {
        // ✅ Non-iOS devices (Android/Web)
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Redirecting...</title>
            <script>
              // Try deep link
              window.location.href = "${IOS_APP_SCHEME}://linkedin/callback?user=${encodedUserData}";
              
              // Fallback after delay
              setTimeout(function() {
                document.getElementById('manual-return').style.display = 'block';
              }, 2000);
            </script>
            <style>
              body { font-family: system-ui, sans-serif; margin: 20px; text-align: center; }
              .button { background-color: #0A66C2; color: white; padding: 12px 20px; border-radius: 4px; 
                        text-decoration: none; display: inline-block; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h2>Login successful! Redirecting to the app...</h2>
            <div id="manual-return" style="display:none">
              <p>If you are not redirected automatically, <a href="${IOS_APP_SCHEME}://linkedin/callback?user=${encodedUserData}" class="button">click here</a>.</p>
            </div>
          </body>
          </html>
        `);
      }
    });
  } catch (error) {
    console.error("❌ Error:", error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get access token or user data' });
  }
});

// ✅ API endpoint to check auth status and retrieve stored user data
app.get('/api/linkedin/authcheck', (req, res) => {
  res.json({ message: 'Use this endpoint in your app to retrieve auth status' });
});

// ✅ Start HTTP server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
