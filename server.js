const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = '86pg9onlum0hah';
const CLIENT_SECRET = 'WPL_AP1.9BuYogv2pcEsswsG.PdCw5Q=='; // Keep this secure
const REDIRECT_URI = 'https://linkedinbackend-1.onrender.com/linkedin/callback';

// 🔹 Route to handle LinkedIn callback  
app.get('/linkedin/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  console.log('Received LinkedIn code:', code);

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

    console.log('LinkedIn Access Token:', response.data);

    // 🔹 Redirect user to a success page (or return JSON response)
    res.json({ message: 'Login successful!', access_token: response.data.access_token });

  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

// Ensure server listens on 0.0.0.0 so other devices can access it
app.listen(8080, '0.0.0.0', () => console.log('Server running on port 8080'));