const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000; // تحديد البورت هنا


// إضافة نقطة النهاية للمسار الجذر "/"
// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index.html file at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// مسار لتحميل الفيديو
app.get('/download', async (req, res) => {
  const { url, quality } = req.query;

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  const tempVideoPath = path.join(__dirname, 'downloads', 'video.mp4');
  const tempAudioPath = path.join(__dirname, 'downloads', 'audio.mp3');
  const finalVideoPath = path.join(__dirname, 'downloads', 'final-video.mp4');

  try {
    // بدء تحميل الفيديو باستخدام yt-dlp
    const ytProcess = spawn('yt-dlp', [
      '--cookies', 'path/to/cookies.txt', // استبدل بالمسار الصحيح لملف الكوكيز
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
          '--cookies', 'path/to/cookies.txt', // نفس ملف الكوكيز هنا
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
          res.download(finalVideoPath); // إرسال الفيديو النهائي للمستخدم مباشرة
        });
      } else {
        res.download(tempVideoPath); // إرسال الفيديو الذي يحتوي على الصوت مباشرة
      }
    });
  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).json({ error: 'Failed to download video' });
  }
});

// دالة للتحقق من وجود الصوت في الفيديو
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

// دالة لدمج الفيديو والصوت
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

// بدء الخادم على البورت المحدد
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
