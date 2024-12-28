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

// Ensure 'downloads' directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

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

        res.status(200).json({ formats });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch formats', message: error });
    }
});

// Route to handle downloading content and show progress via SSE
app.get('/download', (req, res) => {
    const { url, quality } = req.query;

    if (!url || !quality) {
        return res.status(400).json({ error: 'URL and quality are required' });
    }

    const videoPath = path.join(downloadsDir, 'video.mp4'); // Path to save the video file

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        // Use yt-dlp with the progress option to download and track progress
        const command = `yt-dlp -f ${quality} -o "${videoPath}" --progress ${url}`;

        const downloadProcess = exec(command);

        // Capture output data and send progress to client
        downloadProcess.stdout.on('data', (data) => {
            // Parse the progress percentage from yt-dlp output
            const match = data.match(/(?<=\().*?(\d+)%/);
            if (match) {
                const progress = match[1]; // Extract the percentage
                res.write(`data: ${progress}%\n\n`); // Send the progress to the client
            }
        });

        downloadProcess.stderr.on('data', (data) => {
            // Send any errors to the client
            res.write(`data: Error: ${data}\n\n`);
        });

        downloadProcess.on('close', (code) => {
            if (code === 0) {
                res.write(`data: Download complete!\n\n`);
                res.write(`data: The video is ready for download.\n\n`);
                res.end();
            } else {
                res.write(`data: Error: Download failed\n\n`);
                res.end();
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
