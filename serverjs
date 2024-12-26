const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle video download
app.post('/download', (req, res) => {
  const videoUrl = req.body.url;

  if (!videoUrl) {
    return res.status(400).send('No URL provided.');
  }

  const outputPath = path.join(__dirname, 'downloads', 'video.mp4');
  const command = `yt-dlp -o "${outputPath}" ${videoUrl}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error during download: ${stderr}`);
      return res.status(500).send('An error occurred during the download.');
    }

    console.log('Download complete:', stdout);
    res.download(outputPath, 'video.mp4', (err) => {
      if (err) console.error(err);

      // Cleanup the downloaded file
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    });
  });
});

// Create downloads folder if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'downloads'))) {
  fs.mkdirSync(path.join(__dirname, 'downloads'));
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
