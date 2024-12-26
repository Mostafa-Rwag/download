const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies
app.use(express.json());

// Serve the index.html content from JS file
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Video Downloader</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f4f4f4;
        }
        .container {
          text-align: center;
          background-color: #fff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        input[type="text"] {
          padding: 10px;
          margin-bottom: 15px;
          width: 100%;
          max-width: 400px;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        button {
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        button:hover {
          background-color: #45a049;
        }
        .quality-options {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .quality-option {
          padding: 8px;
          background-color: #f1f1f1;
          margin: 5px;
          border-radius: 5px;
          cursor: pointer;
          width: 100px;
          text-align: center;
        }
        .quality-option:hover {
          background-color: #ddd;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Video Downloader</h1>
        <input type="text" id="url" placeholder="Enter Video URL" />
        <button onclick="getFormats()">Get Formats</button>
        
        <div id="quality-options" class="quality-options"></div>
      </div>

      <script>
        async function getFormats() {
          const url = document.getElementById("url").value;
          if (!url) {
            alert("Please enter a valid URL.");
            return;
          }
          
          const response = await fetch('/get-formats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
          });
          
          const data = await response.json();
          if (data.formats && data.formats.length > 0) {
            displayQualityOptions(data.formats);
          } else {
            alert("No formats found.");
          }
        }

        function displayQualityOptions(formats) {
          const qualityOptionsContainer = document.getElementById("quality-options");
          qualityOptionsContainer.innerHTML = '';
          
          formats.forEach(format => {
            const button = document.createElement("button");
            button.classList.add("quality-option");
            button.textContent = `${format.code} - ${format.description}`;
            button.onclick = () => downloadVideo(format.code);
            qualityOptionsContainer.appendChild(button);
          });
        }

        async function downloadVideo(quality) {
          const url = document.getElementById("url").value;
          const response = await fetch('/download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url, quality })
          });

          const result = await response.json();
          if (result.message) {
            alert(result.message);
          } else {
            alert("Failed to download the video.");
          }
        }
      </script>
    </body>
    </html>
  `); // End of res.send() content
});

// Route to get video formats (quality options)
app.post('/get-formats', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const command = `yt-dlp -F ${url}`;
  
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('Error fetching formats:', stderr);
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
app.post('/download', (req, res) => {
  const { url, quality } = req.body;

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  // Execute yt-dlp command to download the video
  const command = `yt-dlp -f ${quality} -o "%(title)s.%(ext)s" ${url}`;
  
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('Error during download:', stderr);
      return res.status(500).json({ error: 'Failed to download video.' });
    }

    // Check if download was successful
    if (stdout.includes("has already been downloaded") || stdout.includes("File exists")) {
      return res.status(200).json({ message: 'File already exists, skipping download.' });
    }

    console.log('Video downloaded:', stdout);
    res.json({ message: 'Download successful' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
