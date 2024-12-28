const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to get video formats (excluding WebM)
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

        const formats = result
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('Format code') && !line.includes('webm'))
            .map(line => {
                const parts = line.trim().split(/\s{2,}/);
                return { code: parts[0], description: parts.slice(1).join(' ') };
            });

        // تصفية الجودات بناءً على قيم الدقة
        const resolutions = [480, 720, 1080, 1440, 2160, 4320];
        const selectedFormats = formats.filter(format => {
            const match = format.description.match(/(\d+)p/);
            return match && resolutions.includes(parseInt(match[1]));
        });

        res.status(200).json({ formats: selectedFormats });
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

    const videoPath = path.join(__dirname, 'downloads', 'video.mp4');

    try {
        await new Promise((resolve, reject) => {
            const command = `yt-dlp -f ${quality} -o "${videoPath}" ${url}`;
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    reject(`Error during video download: ${stderr}`);
                } else {
                    resolve(stdout);
                }
            });
        });

        res.download(videoPath, 'video.mp4', (err) => {
            if (err) {
                console.error('Error during file download:', err);
                res.status(500).send('Error during download');
            }
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
