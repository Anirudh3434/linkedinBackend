const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = '86pg9onlum0hah';
const CLIENT_SECRET = 'WPL_AP1.9BuYogv2pcEsswsG.PdCw5Q=='; // Keep this secure
const REDIRECT_URI = 'https://linkedinbackend-1.onrender.com/linkedin/callback'; // Updated

app.post('/exchange-token', async (req, res) => {
  const { code } = req.body;

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

    res.json(response.data);
  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

app.get('/linkedin/callback', (req, res) => {
  res.send('LinkedIn OAuth Callback - Backend is working!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));