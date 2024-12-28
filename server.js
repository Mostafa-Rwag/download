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
app.get('/get-formats', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const command = `yt-dlp -F ${url}`;
        exec(command, (err, stdout, stderr) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching formats', message: stderr });
            }

            // Parse the formats
            const lines = stdout.split('\n');
            const formats = lines
                .filter(line => line.includes('video'))
                .map(line => {
                    const parts = line.split(/\s+/);
                    return {
                        code: parts[0],
                        resolution: parts[3],
                        format: parts[2],
                        description: `${parts[3]} - ${parts[2]}`,
                    };
                });

            // Send available formats to the frontend
            res.json({ formats });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch formats' });
    }
});



// Route to handle downloading content with quality selection
// Route to handle downloading content with quality selection
app.get('/download', async (req, res) => {
    const { url, quality } = req.query;

    if (!url || !quality) {
        return res.status(400).json({ error: 'URL and quality are required' });
    }

    const videoPath = path.join(__dirname, 'downloads', 'video.mp4');
    const audioPath = path.join(__dirname, 'downloads', 'audio.mp3');

    try {
        // Download video-only or audio if necessary
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

        // Check if video has audio; if not, download the best audio format
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

            // Merge video and audio
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

        // Send video file for download
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
