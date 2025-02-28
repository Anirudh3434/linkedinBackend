const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = '86pg9onlum0hah';
const CLIENT_SECRET = 'WPL_AP1.9BuYogv2pcEsswsG.PdCw5Q=='; // Keep it secure
const REDIRECT_URI = 'https://linkedinbackend-1.onrender.com/linkedin/callback';

// Handle LinkedIn OAuth redirect
app.get('/linkedin/callback', async (req, res) => {
  console.log('Query Params:', req.query); // Debugging

  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`Error from LinkedIn: ${error}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing.' });
  }

  // Exchange code for access token
  try {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    console.log('Access Token Response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

app.listen(8080, () => console.log('Server running on port 8080'));