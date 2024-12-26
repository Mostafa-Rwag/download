const express = require('express');
const { exec } = require('child_process');
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
        <title>YouTube Video Downloader</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f0f0f0;
            }
            h1 {
                font-size: 2.5em;
                color: #333;
            }
            .container {
                width: 80%;
                max-width: 900px;
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                text-align: center;
                margin-top: 20px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            input[type="text"] {
                width: 100%;
                padding: 10px;
                font-size: 16px;
                border: 2px solid #ccc;
                border-radius: 5px;
            }
            select {
                padding: 10px;
                font-size: 16px;
                border: 2px solid #ccc;
                border-radius: 5px;
            }
            button {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 15px 30px;
                cursor: pointer;
                font-size: 18px;
                border-radius: 5px;
            }
            button:hover {
                background-color: #45a049;
            }
            video {
                margin-top: 20px;
                max-width: 100%;
                border-radius: 10px;
                border: 2px solid #ddd;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
        </style>
    </head>
    <body>
        <h1>YouTube Video Downloader</h1>
        <div class="container">
            <form id="downloadForm">
                <div class="form-group">
                    <label for="url">YouTube Video URL:</label><br>
                    <input type="text" id="url" name="url" placeholder="Enter YouTube URL" required>
                </div>
                <div class="form-group">
                    <label for="quality">Select Video Quality:</label><br>
                    <select id="quality" name="quality" required>
                        <option value="">Select quality</option>
                    </select>
                </div>
                <button type="submit">Download Video</button>
            </form>

            <div id="videoContainer" style="display: none;">
                <h3>Video Preview</h3>
                <video id="videoPlayer" controls>
                    <source id="videoSource" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>

        <script>
            const form = document.getElementById('downloadForm');
            const urlInput = document.getElementById('url');
            const qualitySelect = document.getElementById('quality');
            const videoContainer = document.getElementById('videoContainer');
            const videoPlayer = document.getElementById('videoPlayer');
            const videoSource = document.getElementById('videoSource');

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const url = urlInput.value;
                if (!url) return alert('Please provide a valid URL.');

                // Fetch available formats from server
                try {
                    const response = await fetch('/get-formats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    });
                    const data = await response.json();
                    if (data.formats && data.formats.length) {
                        populateQualityOptions(data.formats);
                    } else {
                        alert('No formats found.');
                    }
                } catch (error) {
                    alert('Error fetching video formats.');
                    console.error(error);
                }
            });

            // Populate the quality options based on the fetched formats
            function populateQualityOptions(formats) {
                qualitySelect.innerHTML = '<option value="">Select quality</option>'; // Reset options
                formats.forEach(format => {
                    const option = document.createElement('option');
                    option.value = format.code;
                    option.textContent = format.description;
                    qualitySelect.appendChild(option);
                });
            }

            // Handle the selection of video quality and stream the video
            qualitySelect.addEventListener('change', async () => {
                const url = urlInput.value;
                const quality = qualitySelect.value;

                if (quality) {
                    videoContainer.style.display = 'block'; // Show video container
                    videoPlayer.src = ''; // Clear previous source

                    try {
                        const response = await fetch(`/download?url=${encodeURIComponent(url)}&quality=${encodeURIComponent(quality)}`);
                        const videoBlob = await response.blob();
                        const videoUrl = URL.createObjectURL(videoBlob);
                        videoSource.src = videoUrl; // Set new video source
                        videoPlayer.load(); // Load new video
                    } catch (error) {
                        alert('Error downloading video.');
                        console.error(error);
                    }
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Route to get video formats (quality options)
app.post('/get-formats', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // yt-dlp command to get video formats
  const command = `yt-dlp -F ${url}`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error fetching formats', message: stderr });
    }
    const formats = stdout
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('Format code'))
      .map(line => {
        const parts = line.trim().split(/\s{2,}/);
        return { code: parts[0], description: parts.slice(1).join(' ') };
      });
    res.status(200).json({ formats });
  });
});

// Route to handle downloading content with quality selection
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
