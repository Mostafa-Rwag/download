const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve `index.html`
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fetch video formats
app.post('/get-formats', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const command = `yt-dlp -F ${url}`;

  try {
    const result = await new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject(`Error fetching formats: ${stderr}`);
        } else {
          resolve(stdout);
        }
      });
    });

    // Parse formats
    const formats = result
      .split('\n')
      .filter(line => line.includes('mp4') && line.includes('audio'))
      .map(line => {
        const parts = line.trim().split(/\s{2,}/);
        return { code: parts[0], description: parts.slice(1).join(' ') };
      });

    res.status(200).json({ formats });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch formats', message: error });
  }
});

// Download video
app.get('/download', async (req, res) => {
  const { url, quality } = req.query;

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  const downloadPath = path.join(__dirname, 'downloads', 'video.mp4');

  try {
    const command = `yt-dlp -f ${quality} -o "${downloadPath}" ${url}`;
    await new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject(`Error during download: ${stderr}`);
        } else {
          resolve(stdout);
        }
      });
    });

    res.download(downloadPath); // Send the file to the client
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to download video', message: error });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
