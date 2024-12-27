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

  const command = `yt-dlp -j ${url}`;

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

    const videoData = JSON.parse(result);
    const formats = videoData.formats
      .filter(format => format.ext === 'mp4')
      .filter(format => ['144p', '240p', '360p', '480p', '720p', '1080p'].includes(format.format_note))
      .map(format => ({
        code: format.format_id,
        description: `${format.format_note} (${format.ext})`,
      }));

    res.status(200).json({ formats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch formats', message: error });
  }
});

// Download video
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
          console.error('yt-dlp error:', stderr); // سجل أي أخطاء
          reject(`Error fetching formats: ${stderr}`);
        } else {
          resolve(stdout);
        }
      });
    });

    const formats = result
      .split('\n')
      .filter(line => line.trim() && line.includes('mp4')) // عرض فقط الصيغ mp4
      .map(line => {
        const parts = line.trim().split(/\s{2,}/);
        return { code: parts[0], description: parts.slice(1).join(' ') };
      });

    res.status(200).json({ formats });
  } catch (error) {
    console.error('Error fetching formats:', error); // عرض الأخطاء في وحدة التحكم
    res.status(500).json({ error: 'Failed to fetch formats', message: error });
  }
});



const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve(stdout);
    });
  });
};

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
