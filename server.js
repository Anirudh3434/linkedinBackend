const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = '86pg9onlum0hah';
const CLIENT_SECRET = 'WPL_AP1.9BuYogv2pcEsswsG.PdCw5Q==';
const REDIRECT_URI = 'https://linkedinbackend-1.onrender.com/linkedin/callback';

app.get('/linkedin/callback', async (req, res) => {
  console.log("🔹 Callback URL hit");  // Debugging

  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error("LinkedIn Error:", error, error_description);
    return res.status(400).json({ error, error_description });
  }

  if (!code) {
    console.error("❌ Authorization code is missing");
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

    console.log("✅ Token Response:", tokenResponse.data);
    res.json(tokenResponse.data);
  } catch (tokenError) {
    console.error("❌ Error exchanging token:", tokenError.response.data);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

app.listen(8080, () => console.log('🚀 Server running on port 8080'));