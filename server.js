const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index.html file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to get video formats (quality options)
app.post('/get-formats', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // yt-dlp command to get video formats
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

        // Parse and filter formats
        const formats = result
            .split('\n')
            .filter(line => line.match(/(360p|480p|720p)/)) // Filter popular qualities
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

// Route to handle downloading content with quality selection
app.get('/download', async (req, res) => {
    const { url, quality } = req.query;

    if (!url || !quality) {
        return res.status(400).json({ error: 'URL and quality are required' });
    }

    const uniqueName = `video_${Date.now()}.mp4`;
    const downloadPath = path.join(__dirname, 'downloads', uniqueName);

    try {
        const command = `yt-dlp -f "${quality}+bestaudio/best" -o "${downloadPath}" ${url}`;
        await new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    reject(`Error during download: ${stderr}`);
                } else {
                    resolve(stdout);
                }
            });
        });
        res.download(downloadPath, uniqueName, () => {
            fs.unlinkSync(downloadPath); // Cleanup file after download
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to download video', message: error });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
