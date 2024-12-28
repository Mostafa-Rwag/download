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
            .filter(line => line.trim() && !line.startsWith('Format code'))
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

    const downloadDir = path.join(__dirname, 'downloads');
    const videoPath = path.join(downloadDir, 'video.mp4');
    const audioPath = path.join(downloadDir, 'audio.mp4');
    const finalPath = path.join(downloadDir, 'final_video.mp4');

    try {
        // Ensure downloads directory exists
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        // Download the selected video format
        const videoCommand = `yt-dlp -f ${quality} -o "${videoPath}" ${url}`;
        await new Promise((resolve, reject) => {
            exec(videoCommand, (err, stdout, stderr) => {
                if (err) reject(`Error downloading video: ${stderr}`);
                else resolve(stdout);
            });
        });

        // Check if video is "video only"
        const isVideoOnly = quality.includes('video');

        if (isVideoOnly) {
            // Download the best audio
            const audioCommand = `yt-dlp -f bestaudio -o "${audioPath}" ${url}`;
            await new Promise((resolve, reject) => {
                exec(audioCommand, (err, stdout, stderr) => {
                    if (err) reject(`Error downloading audio: ${stderr}`);
                    else resolve(stdout);
                });
            });

            // Merge video and audio using FFmpeg
            const mergeCommand = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac "${finalPath}"`;
            await new Promise((resolve, reject) => {
                exec(mergeCommand, (err, stdout, stderr) => {
                    if (err) reject(`Error merging video and audio: ${stderr}`);
                    else resolve(stdout);
                });
            });

            res.download(finalPath); // Send the final merged video to the client
        } else {
            res.download(videoPath); // Send the video directly if it has audio
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to download video', message: error });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
