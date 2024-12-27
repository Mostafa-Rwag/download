const express = require('express');
const { spawn } = require('child_process'); // استيراد spawn من child_process
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to download video directly to client
app.get('/download', (req, res) => {
  const { url, quality } = req.query;

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  const tempVideoPath = path.join(__dirname, 'downloads', 'video.mp4');
  const tempAudioPath = path.join(__dirname, 'downloads', 'audio.mp3');
  const finalVideoPath = path.join(__dirname, 'downloads', 'final-video.mp4');

  try {
    // Step 1: Download the video in the requested quality (only mp4)
    const ytProcess = spawn('yt-dlp', ['-f', quality, '-o', tempVideoPath, url]);

    ytProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    ytProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ytProcess.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Failed to download video' });
      }

      // Step 2: Check if the video has audio
      const hasAudio = await checkAudioInVideo(tempVideoPath);

      if (!hasAudio) {
        // If video doesn't have audio, download audio separately
        const audioProcess = spawn('yt-dlp', ['-f', 'bestaudio', '-o', tempAudioPath, url]);

        audioProcess.stdout.on('data', (data) => {
          console.log(`stdout (audio): ${data}`);
        });

        audioProcess.stderr.on('data', (data) => {
          console.error(`stderr (audio): ${data}`);
        });

        audioProcess.on('close', async (audioCode) => {
          if (audioCode !== 0) {
            return res.status(500).json({ error: 'Failed to download audio' });
          }

          // Step 3: Merge video and audio
          await mergeVideoAndAudio(tempVideoPath, tempAudioPath, finalVideoPath);

          // Step 4: Send the final video to the client for download
          res.download(finalVideoPath, 'video.mp4', (err) => {
            if (err) {
              console.error('Error sending file:', err);
            }

            // Clean up temporary files after download
            fs.unlinkSync(tempVideoPath);
            fs.unlinkSync(tempAudioPath);
            fs.unlinkSync(finalVideoPath);
          });
        });
      } else {
        // If the video has audio, send it directly
        res.download(tempVideoPath, 'video.mp4', (err) => {
          if (err) {
            console.error('Error sending file:', err);
          }

          // Clean up temporary files after download
          fs.unlinkSync(tempVideoPath);
        });
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to download video', message: error.message });
  }
});

// Function to check if video has audio
function checkAudioInVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const ffprobeProcess = spawn('ffprobe', ['-v', 'error', '-show_streams', videoPath]);

    let hasAudio = false;

    ffprobeProcess.stdout.on('data', (data) => {
      if (data.toString().includes('audio')) {
        hasAudio = true;
      }
    });

    ffprobeProcess.on('close', (code) => {
      if (code !== 0) {
        return reject('Error checking audio in video');
      }
      resolve(hasAudio);
    });
  });
}

// Function to merge video and audio
function mergeVideoAndAudio(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const mergeProcess = spawn('ffmpeg', ['-i', videoPath, '-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-strict', 'experimental', outputPath]);

    mergeProcess.stdout.on('data', (data) => {
      console.log(`stdout (merge): ${data}`);
    });

    mergeProcess.stderr.on('data', (data) => {
      console.error(`stderr (merge): ${data}`);
    });

    mergeProcess.on('close', (code) => {
      if (code !== 0) {
        return reject('Error merging video and audio');
      }
      resolve();
    });
  });
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
