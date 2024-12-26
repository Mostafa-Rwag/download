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

        // Define the allowed qualities
        const allowedQualities = ['144', '280', '480', '640', '720', '1080', '1440', '2160'];

        // Parse formats from the command output
        const formats = result
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('Format code'))
            .map(line => {
                const parts = line.trim().split(/\s{2,}/);
                return { code: parts[0], description: parts.slice(1).join(' ') };
            })
            .filter(format => allowedQualities.some(quality => format.description.includes(quality))) // Filter for required qualities

        res.status(200).json({ formats });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch formats', message: error });
    }
});
app.get('/get-video-info', (req, res) => {
    console.log('Request received at /get-video-info');
    
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Simulate data fetching here
    const data = {
        previewUrl: 'https://path/to/preview/video.mp4',
        formats: [
            { quality: '144p', code: '144p_code' },
            { quality: '1080p', code: '1080p_code' },
            { quality: '4k', code: '4k_code' }
        ]
    };

    console.log('Sending data:', data);  // Log the data being sent
    res.json(data);
});

// Route to handle downloading content with quality selection
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
        res.download(downloadPath); // Send the video file to the client
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to download video', message: error });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
