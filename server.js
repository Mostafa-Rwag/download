const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve the HTML page from the server
app.use(express.static(path.join(__dirname, 'indexhtml'));

// Route to fetch available video formats
app.post('/get-formats', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    exec(`yt-dlp -F ${url}`, (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return res.status(500).json({ error: 'Failed to fetch formats' });
        }

        const formats = stdout
            .split('\n')
            .filter(line => /^\d/.test(line))
            .map(line => {
                const [code, ...rest] = line.trim().split(/\s{2,}/);
                return { code, description: rest.join(' ') };
            });

        res.json({ formats });
    });
});

// Route to download the selected video
app.post('/download', (req, res) => {
    const { url, quality } = req.body;

    if (!url || !quality) {
        return res.status(400).send('URL and quality are required.');
    }

    const ytDlp = exec(`yt-dlp -f ${quality} -o - ${url}`, { maxBuffer: 1024 * 500 });

    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp process exited with code ${code}`);
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
