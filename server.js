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

// Route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to get available formats
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

        // Parse available formats
        const formats = result
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('Format code'))
            .map(line => {
                const parts = line.trim().split(/\s{2,}/);
                return { code: parts[0], description: parts.slice(1).join(' ') };
            })
            .filter(format => {
                // Filter for MP4 with both video and audio
                return (
                    /mp4/.test(format.description.toLowerCase()) &&
                    /video\+audio/.test(format.description.toLowerCase())
                );
            });

        res.status(200).json({ formats });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch formats', message: error });
    }
});

// Route to download video
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

        res.download(downloadPath, 'video.mp4', err => {
            if (err) console.error('Error sending file:', err);
            fs.unlink(downloadPath, () => {}); // Delete the file after sending
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
