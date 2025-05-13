require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const fs = require('fs');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ SSL Certificates
const privateKey = fs.readFileSync('./key.pem', 'utf8');
const certificate = fs.readFileSync('./cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// ✅ LinkedIn OAuth Config
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://linkedinbackend-ndvv.onrender.com/linkedin/callback';

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

      // ✅ Send HTML page with auto redirect and fallback link
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Redirecting...</title>
          <script>
            setTimeout(function() {
              window.location.href = "myapp://linkedin/callback?user=${encodedUserData}";
            }, 3000);
          </script>
        </head>
        <body>
          <h2>Login successful! Redirecting to the app...</h2>
          <p>If you are not redirected automatically, <a href="myapp://linkedin/callback?user=${encodedUserData}">click here</a>.</p>
        </body>
        </html>
      `);
    });

  } catch (error) {
    console.error("❌ Error:", error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get access token or user data' });
  }
});

// ✅ Create HTTPS server
const PORT = process.env.PORT || 8080;
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => console.log(`🚀 Server running on https://localhost:${PORT}`));
