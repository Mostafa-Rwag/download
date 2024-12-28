const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());
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

        // Remove duplicate MP4 formats (MP4 and MP4 DASH)
        const uniqueFormats = [];
        const seen = new Set();

        formats.forEach(format => {
            if (!seen.has(format.description)) {
                seen.add(format.description);
                uniqueFormats.push(format);
            }
        });

        res.status(200).json({ formats: uniqueFormats });
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

    try {
        // Set headers before sending any content
        res.setHeader('Content-Type', 'video/mp4'); // Set content type for video file
        res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"'); // Force download with the desired file name

        // Start the download process and make sure we set headers before sending the video.
        const command = `yt-dlp -f ${quality} -o - ${url}`;
        const videoStream = exec(command);

        // Pipe the video stream to the response so it can be downloaded by the user
        videoStream.stdout.pipe(res);

        videoStream.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Download failed with code ${code}`);
                res.status(500).send('Failed to download the video.');
            } else {
                console.log('Download complete.');
            }
        });

        videoStream.on('error', (error) => {
            console.error('Error:', error);
            res.status(500).send('Failed to download the video.');
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
