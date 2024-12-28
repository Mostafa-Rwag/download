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

    const command = `yt-dlp -F --cookies cookies.txt ${url}`;

    try {
        const result = await new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error executing yt-dlp: ${stderr}`);
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
        res.status(500).json({ error: 'Failed to fetch formats', message: error.message });
    }
});

// Route to handle downloading content with quality selection
app.get('/download', async (req, res) => {
    const { url, quality } = req.query;

    if (!url || !quality) {
        return res.status(400).json({ error: 'URL and quality are required' });
    }

    const videoPath = path.join(__dirname, 'downloads', 'video.mp4');
    const audioPath = path.join(__dirname, 'downloads', 'audio.mp3');

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

        const hasAudio = quality.includes('+');
        if (!hasAudio) {
            await new Promise((resolve, reject) => {
                const command = `yt-dlp -f bestaudio -o "${audioPath}" ${url}`;
                exec(command, (err, stdout, stderr) => {
                    if (err) {
                        reject(`Error during audio download: ${stderr}`);
                    } else {
                        resolve(stdout);
                    }
                });
            });

            const mergedPath = path.join(__dirname, 'downloads', 'merged_video.mp4');
            await new Promise((resolve, reject) => {
                const command = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac "${mergedPath}" -y`;
                exec(command, (err, stdout, stderr) => {
                    if (err) {
                        reject(`Error during merging: ${stderr}`);
                    } else {
                        resolve(stdout);
                    }
                });
            });

            fs.unlinkSync(videoPath);
            fs.renameSync(mergedPath, videoPath);
        }

        const stat = fs.statSync(videoPath);
        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
        });

        const readStream = fs.createReadStream(videoPath);

        // Streaming video to client
        readStream.on('data', chunk => {
            res.write(chunk);
        });

        

        readStream.on('error', err => {
            console.error('Error streaming video:', err);
            res.status(500).json({ error: 'Failed to stream video' });
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
