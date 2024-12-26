const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from the 'downloads' folder
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Serve the index.html file when accessing the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint for downloading the video
app.get('/download', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).send('No video URL provided.');
    }

    // Set the path where you want to download the video
    const downloadPath = path.join(__dirname, 'downloads', 'video.mp4');
    // Execute yt-dlp command to download the video
    exec(`yt-dlp -f best -o "${downloadPath}" ${videoUrl}`, (err, stdout, stderr) => {
        if (err) {
            console.error('Error during download:', stderr);
            return res.status(500).send('Failed to download video.');
        }
        console.log('Video downloaded:', stdout);
        res.download(downloadPath); // Send the video file to the client
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
