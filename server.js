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

  const command = `yt-dlp -j ${url}`; // Use JSON output for parsing

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

    // Parse JSON output
    const videoData = JSON.parse(result);
    const formats = videoData.formats
      .filter(format => format.ext === 'mp4' && format.acodec !== 'none' && format.vcodec !== 'none') // MP4 with both audio & video
      .filter(format => ['360p', '480p', '720p', '1080p'].includes(format.format_note)) // Standard qualities
      .map(format => ({
        code: format.format_id,
        description: `${format.format_note} (${format.ext})`,
      }));

    res.status(200).json({ formats });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch formats', message: error });
  }
});

// Download video with audio merge if needed
app.get('/download', async (req, res) => {
  const { url, quality } = req.query;

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  const downloadPath = path.join(__dirname, 'downloads', 'video.mp4');
  const tempAudioPath = path.join(__dirname, 'downloads', 'audio.mp3');
  const tempVideoPath = path.join(__dirname, 'downloads', 'video-only.mp4');

  try {
    // Command to download the selected quality
    const command = `yt-dlp -f ${quality} -o "${tempVideoPath}" ${url}`;
    await new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          reject(`Error during video download: ${stderr}`);
        } else {
          resolve(stdout);
        }
      });
    });

    // Check if the video has audio or not
    const checkAudioCommand = `ffprobe -v error -show_streams ${tempVideoPath} | grep codec_type | grep audio`;
    const audioAvailable = await new Promise((resolve, reject) => {
      exec(checkAudioCommand, (err, stdout, stderr) => {
        if (err) {
          resolve(false); // If error, assume no audio
        } else {
          resolve(stdout.includes('audio'));
        }
      });
    });

    // If no audio, download the audio and merge with the video
    if (!audioAvailable) {
      const audioCommand = `yt-dlp -f bestaudio -o "${tempAudioPath}" ${url}`;
      await new Promise((resolve, reject) => {
        exec(audioCommand, (err, stdout, stderr) => {
          if (err) {
            reject(`Error during audio download: ${stderr}`);
          } else {
            resolve(stdout);
          }
        });
      });

      // Merge audio and video
      const mergeCommand = `ffmpeg -i ${tempVideoPath} -i ${tempAudioPath} -c:v copy -c:a aac -strict experimental ${downloadPath}`;
      await new Promise((resolve, reject) => {
        exec(mergeCommand, (err, stdout, stderr) => {
          if (err) {
            reject(`Error during merge: ${stderr}`);
          } else {
            resolve(stdout);
          }
        });
      });

      // Clean up temporary files
      fs.unlinkSync(tempAudioPath);
      fs.unlinkSync(tempVideoPath);
    } else {
      // If the video already has audio, simply rename the video
      fs.renameSync(tempVideoPath, downloadPath);
    }

    res.download(downloadPath); // Send the video file to the client
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to download video', message: error });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
