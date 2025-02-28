const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = '86pg9onlum0hah'; // Replace with your LinkedIn Client ID
const CLIENT_SECRET = 'WPL_AP1.9BuYogv2pcEsswsG.PdCw5Q=='; // Replace with your LinkedIn Client Secret
const REDIRECT_URI = 'https://linkedinbackend-1.onrender.com/linkedin/callback'; // Replace with your hosted backend URL

app.get('/linkedin/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  try {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = response.data.access_token;

    // Fetch user profile data
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json({
      accessToken,
      profile: profileResponse.data,
    });
  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

app.listen(8084, () => console.log('Server running on port 8084'));