const { spawn } = require('child_process');
const path = require('path');

async function downloadVideo(url, quality) {
  try {
    const tempVideoPath = path.join(__dirname, 'downloads', 'video.mp4');
    const tempAudioPath = path.join(__dirname, 'downloads', 'audio.mp3');
    const finalVideoPath = path.join(__dirname, 'downloads', 'final-video.mp4');

    // Use yt-dlp with cookies
    const ytProcess = spawn('yt-dlp', [
      '--cookies', 'path/to/cookies.txt', // Replace with the correct path to your cookies file
      '-f', quality, 
      '-o', tempVideoPath, 
      url
    ]);

    ytProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    ytProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ytProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('Failed to download video');
        return;
      }

      const hasAudio = await checkAudioInVideo(tempVideoPath);

      if (!hasAudio) {
        const audioProcess = spawn('yt-dlp', [
          '--cookies', 'path/to/cookies.txt', // Same cookies file used here
          '-f', 'bestaudio',
          '-o', tempAudioPath,
          url
        ]);

        audioProcess.stdout.on('data', (data) => {
          console.log(`stdout (audio): ${data}`);
        });

        audioProcess.stderr.on('data', (data) => {
          console.error(`stderr (audio): ${data}`);
        });

        audioProcess.on('close', async (audioCode) => {
          if (audioCode !== 0) {
            console.error('Failed to download audio');
            return;
          }

          await mergeVideoAndAudio(tempVideoPath, tempAudioPath, finalVideoPath);
          res.download(finalVideoPath); // Send final merged video to client
        });
      } else {
        res.download(tempVideoPath); // Video with audio already
      }
    });
  } catch (error) {
    console.error('Error downloading video:', error);
  }
}

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
        reject('Error checking audio in video');
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
        reject('Error merging video and audio');
      }
      resolve();
    });
  });
}
