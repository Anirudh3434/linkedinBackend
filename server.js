require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');  // ✅ For LinkedIn public key retrieval

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://linkedinbackend-ndvv.onrender.com/linkedin/callback';

// ✅ LinkedIn JWKS client for token verification
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
    // ✅ Exchange Authorization Code for Access Token
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

    // ✅ Verify ID Token using LinkedIn public key
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
        exp: decoded.exp,  // Expiry timestamp
      };

      // ✅ Redirect back to the app with token
      res.redirect(`myapp://linkedin/callback?token=${userData}`);

    });

  } catch (error) {
    console.error("❌ Error:", error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get access token or user data' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
