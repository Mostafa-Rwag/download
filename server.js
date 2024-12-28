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

    // استخدم ملف تعريف الارتباط لاجتياز التحقق
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

        // إزالة التكرارات في صيغ MP4 (MP4 و MP4 DASH)
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
// Route to handle downloading content with quality selection
app.get('/download', async (req, res) => {
    const { url, quality } = req.query;

    if (!url || !quality) {
        return res.status(400).json({ error: 'URL and quality are required' });
    }

    const videoPath = path.join(__dirname, 'downloads', 'video.mp4');
    const audioPath = path.join(__dirname, 'downloads', 'audio.mp3');

    try {
        console.log('Starting download for URL:', url);
        await new Promise((resolve, reject) => {
            const command = `yt-dlp -f ${quality} -o "${videoPath}" ${url}`;
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    console.log('Error during video download:', stderr);
                    reject(`Error during video download: ${stderr}`);
                } else {
                    console.log('Video download completed');
                    resolve(stdout);
                }
            });
        });

        const stat = fs.statSync(videoPath);
        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
        });

        const readStream = fs.createReadStream(videoPath);
        let loaded = 0;

        readStream.on('data', chunk => {
            loaded += chunk.length;
            const progress = (loaded / stat.size) * 100;
            console.log(`Progress: ${progress}%`);
            res.write(JSON.stringify({ progress }));
        });

        readStream.on('end', () => {
            console.log('Video streaming completed');
            res.end();
        });

        readStream.pipe(res);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to download video', message: error });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
