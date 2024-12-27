const express = require('express');
const ytDlp = require('yt-dlp');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());  // تأكد من أنك تستخدم هذا middleware لتحليل JSON في الطلبات

// مسار لتحميل الفيديو
app.post('/get-formats', async (req, res) => {
  const { url } = req.body;  // تأكد أن body يحتوي على رابط الفيديو

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // استرجاع الصيغ المتاحة للفيديو باستخدام yt-dlp
    const formats = await ytDlp.getFormats(url);
    res.json(formats);
  } catch (error) {
    console.error('Error fetching formats:', error);
    res.status(500).json({ error: 'Failed to fetch formats' });
  }
});

// مسار لتحميل الفيديو بجودة معينة مع الصوت
app.get('/download', async (req, res) => {
  const { url, quality } = req.query;  // تأكد أن URL والجودة مرسلين في الاستعلام

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  const tempVideoPath = path.join(__dirname, 'downloads', 'video.mp4');
  const tempAudioPath = path.join(__dirname, 'downloads', 'audio.mp3');
  const downloadPath = path.join(__dirname, 'downloads', 'final_video.mp4');

  try {
    // تحميل الفيديو بالجودة المطلوبة
    await ytDlp.exec([url, '-f', quality, '-o', tempVideoPath]);

    // تحقق إذا كان الفيديو يحتوي على صوت
    const hasAudio = await ytDlp.exec([url, '-f', quality, '--get-format', '--get-filename']);

    if (!hasAudio) {
      // إذا لم يكن هناك صوت، قم بتحميل الصوت
      await ytDlp.exec([url, '-f', 'bestaudio', '-o', tempAudioPath]);

      // دمج الصوت مع الفيديو
      const mergeCommand = `ffmpeg -i ${tempVideoPath} -i ${tempAudioPath} -c:v copy -c:a aac -strict experimental ${downloadPath}`;
      await execCommand(mergeCommand);

      // حذف الملفات المؤقتة
      fs.unlinkSync(tempAudioPath);
    } else {
      // إذا كان الفيديو يحتوي على صوت، لا حاجة للدمج
      fs.renameSync(tempVideoPath, downloadPath);
    }

    // إرسال الملف للتنزيل مباشرة للمستخدم
    res.download(downloadPath, 'video.mp4', (err) => {
      if (err) {
        console.error('Download error:', err);
      } else {
        // حذف الملف بعد تحميله
        fs.unlinkSync(downloadPath);
      }
    });

  } catch (error) {
    console.error('Download failed:', error);
    res.status(500).json({ error: 'Failed to download video', message: error.message });
  }
});

// بدء السيرفر
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// دالة تنفيذ الأوامر
function execCommand(command) {
  return new Promise((resolve, reject) => {
    const exec = require('child_process').exec;
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}
