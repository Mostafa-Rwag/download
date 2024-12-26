const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve a basic HTML page for selecting video quality
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YouTube Downloader</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 20px;
          }
          label {
            font-weight: bold;
          }
          .form-group {
            margin-bottom: 15px;
          }
          button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background-color: #45a049;
          }
        </style>
    </head>
    <body>
        <h1>YouTube Video Downloader</h1>
        <form id="downloadForm">
            <div class="form-group">
                <label for="url">YouTube Video URL:</label><br>
                <input type="text" id="url" name="url" required style="width: 300px; padding: 5px;">
            </div>
            <div class="form-group">
                <label for="quality">Quality:</label><br>
                <select id="quality" name="quality" required style="padding: 5px;">
                    <option value="best">Best Quality</option>
                    <option value="worst">Worst Quality</option>
                    <option value="134">MP4 (360p)</option>
                    <option value="136">MP4 (720p)</option>
                    <option value="137">MP4 (1080p)</option>
                </select>
            </div>
            <button type="submit">Download</button>
        </form>
        <script>
            document.getElementById('downloadForm').addEventListener('submit', function (event) {
                event.preventDefault();
                const url = document.getElementById('url').value;
                const quality = document.getElementById('quality').value;
                window.location.href = \`/download?url=\${encodeURIComponent(url)}&quality=\${encodeURIComponent(quality)}\`;
            });
        </script>
    </body>
    </html>
  `);
});

// Route to handle downloading the video
app.get('/download', (req, res) => {
  const { url, quality } = req.query;

  if (!url || !quality) {
    return res.status(400).send('Missing URL or quality.');
  }

  // Set headers for file download
  res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
  res.setHeader('Content-Type', 'video/mp4');

  // Spawn the yt-dlp process
  const ytDlp = spawn('yt-dlp', ['-f', quality, '-o', '-', url]);

  ytDlp.stdout.pipe(res); // Stream the video to the client

  ytDlp.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp process exited with code ${code}`);
      res.status(500).send('Failed to download the video.');
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
