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
app.get('/download', async (req, res) => {
  const { url, quality } = req.query;

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  const downloadPath = path.join(__dirname, 'downloads', 'video.mp4');
  const tempAudioPath = path.join(__dirname, 'downloads', 'audio.mp3');
  const tempVideoPath = path.join(__dirname, 'downloads', 'video-only.mp4');

  try {
    const command = `yt-dlp -f ${quality} -o "${tempVideoPath}" ${url}`;
    await execCommand(command);

    const hasAudio = await execCommand(`ffprobe -v error -show_streams ${tempVideoPath} | grep audio`);

    if (!hasAudio) {
      const audioCommand = `yt-dlp -f bestaudio -o "${tempAudioPath}" ${url}`;
      await execCommand(audioCommand);

      const mergeCommand = `ffmpeg -i ${tempVideoPath} -i ${tempAudioPath} -c:v copy -c:a aac -strict experimental ${downloadPath}`;
      await execCommand(mergeCommand);

      fs.unlinkSync(tempAudioPath);
      fs.unlinkSync(tempVideoPath);
    } else {
      fs.renameSync(tempVideoPath, downloadPath);
    }

    res.download(downloadPath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download video', message: error });
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
