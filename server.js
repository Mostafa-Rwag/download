const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve the HTML page from the server
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
                background-color: #f4f4f9;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                color: #333;
            }
            .container {
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 400px;
                width: 100%;
            }
            h1 {
                color: #555;
                margin-bottom: 20px;
            }
            input, select, button {
                width: 100%;
                padding: 10px;
                margin: 10px 0;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
            }
            button {
                background-color: #007bff;
                color: #fff;
                border: none;
                cursor: pointer;
            }
            button:hover {
                background-color: #0056b3;
            }
            .error {
                color: red;
                margin-top: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>YouTube Video Downloader</h1>
            <form id="downloadForm">
                <input type="text" id="url" name="url" placeholder="Enter YouTube Video URL" required>
                <select id="quality" name="quality">
                    <option value="best">Best Quality</option>
                </select>
                <button type="submit">Download Video</button>
                <p class="error" id="errorMessage"></p>
            </form>
        </div>

        <script>
            document.getElementById('downloadForm').addEventListener('submit', async (event) => {
                event.preventDefault();

                const url = document.getElementById('url').value;
                const quality = document.getElementById('quality').value;

                if (!url) {
                    document.getElementById('errorMessage').textContent = 'Please enter a URL.';
                    return;
                }

                try {
                    const response = await fetch('/download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, quality }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch video.');
                    }

                    const blob = await response.blob();
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = 'video.mp4';
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(downloadUrl);
                    a.remove();
                } catch (error) {
                    document.getElementById('errorMessage').textContent = `Error: ${error.message}`;
                    console.error(error);
                }
            });

            async function fetchFormats(url) {
                const response = await fetch('/get-formats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });

                if (response.ok) {
                    const { formats } = await response.json();
                    const qualityDropdown = document.getElementById('quality');
                    formats.forEach(format => {
                        const option = document.createElement('option');
                        option.value = format.code;
                        option.textContent = format.description;
                        qualityDropdown.appendChild(option);
                    });
                }
            }

            document.getElementById('url').addEventListener('change', (event) => {
                const url = event.target.value;
                if (url) {
                    fetchFormats(url);
                }
            });
        </script>
    </body>
    </html>
    `);
});

// Route to fetch available video formats
app.post('/get-formats', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    exec(`yt-dlp -F ${url}`, (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return res.status(500).json({ error: 'Failed to fetch formats' });
        }

        const formats = stdout
            .split('\n')
            .filter(line => /^\d/.test(line))
            .map(line => {
                const [code, ...rest] = line.trim().split(/\s{2,}/);
                return { code, description: rest.join(' ') };
            });

        res.json({ formats });
    });
});

// Route to download the selected video
app.post('/download', (req, res) => {
    const { url, quality } = req.body;

    if (!url || !quality) {
        return res.status(400).send('URL and quality are required.');
    }

    const ytDlp = exec(`yt-dlp -f ${quality} -o - ${url}`, { maxBuffer: 1024 * 500 });

    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        res.status(500).send('Error during video download: ' + data);
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp process exited with code ${code}`);
            res.status(500).send('Error: Video download process failed.');
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
