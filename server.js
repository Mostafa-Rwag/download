const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // لتحليل body JSON
app.use(express.static(path.join(__dirname, 'downloads'))); // لتقديم الملفات الثابتة مثل الفيديو

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// مسار لتحميل الفيديو بالجودة
app.get('/download', async (req, res) => {
  const { url, quality } = req.query;

  if (!url || !quality) {
    return res.status(400).json({ error: 'URL and quality are required' });
  }

  const tempVideoPath = path.join(__dirname, 'downloads', 'video.mp4');
  const tempAudioPath = path.join(__dirname, 'downloads', 'audio.mp3');
  const downloadPath = path.join(__dirname, 'downloads', 'final_video.mp4');

  try {
    // استخدم yt-dlp لجلب الفئات المتاحة أولاً
    const formats = await getAvailableFormats(url);

    // تحقق مما إذا كانت الجودة المطلوبة موجودة
    if (!formats.some(format => format.format_id === quality)) {
      return res.status(400).json({ error: `Requested quality ${quality} is not available` });
    }

    // استخدام yt-dlp لتحميل الفيديو بالجودة المطلوبة
    const command = `yt-dlp -f ${quality} -o "${tempVideoPath}" ${url}`;
    await execCommand(command);

    // تحقق من وجود الصوت في الفيديو
    const hasAudioCommand = `ffprobe -v error -show_streams ${tempVideoPath} | grep audio`;
    const hasAudio = await execCommand(hasAudioCommand);

    if (!hasAudio) {
      // إذا لم يكن هناك صوت، قم بتحميل الصوت
      const audioCommand = `yt-dlp -f bestaudio -o "${tempAudioPath}" ${url}`;
      await execCommand(audioCommand);

      // دمج الصوت مع الفيديو
      const mergeCommand = `ffmpeg -i ${tempVideoPath} -i ${tempAudioPath} -c:v copy -c:a aac -strict experimental ${downloadPath}`;
      await execCommand(mergeCommand);

      // حذف الملفات المؤقتة
      fs.unlinkSync(tempAudioPath);
    } else {
      fs.renameSync(tempVideoPath, downloadPath);
    }

    // إرسال الفيديو مباشرة للمستخدم للتنزيل
    res.download(downloadPath, 'video.mp4', (err) => {
      if (err) {
        console.error('Download error:', err);
      } else {
        // حذف الملف بعد التنزيل
        fs.unlinkSync(downloadPath);
      }
    });

  } catch (error) {
    console.error('Download failed:', error);
    res.status(500).json({ error: 'Failed to download video', message: error.message });
  }
});

// مسار لجلب الفئات (formats) الخاصة بالفيديو
app.post('/get-formats', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // استخدم yt-dlp لجلب الفئات
  getAvailableFormats(url)
    .then(formats => {
      if (formats.length === 0) {
        return res.status(400).json({ error: 'No formats available for this video' });
      }
      res.json({ formats });
    })
    .catch(error => {
      res.status(500).json({ error: 'Failed to fetch formats', message: error.message });
    });
});

// دالة للحصول على الفئات المتاحة
function getAvailableFormats(url) {
  return new Promise((resolve, reject) => {
    const command = `yt-dlp -F ${url}`;
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject('Error fetching formats: ' + stderr);
      } else {
        const formats = parseFormats(stdout);
        resolve(formats);
      }
    });
  });
}

// دالة تحليل إخراج الفئات
function parseFormats(output) {
  const formats = [];
  const lines = output.split('\n');

  // استخراج الفئات من الإخراج بناءً على التنسيق
  lines.forEach(line => {
    const formatData = line.trim().split(' ');
    if (formatData.length > 1 && !isNaN(formatData[0])) {
      formats.push({
        format_id: formatData[0],
        resolution: formatData[1] || 'N/A',
        extension: formatData[2] || 'N/A',
        filesize: formatData[3] || 'N/A',
      });
    }
  });

  return formats;
}

// دالة تنفيذ الأوامر
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('Error executing command:', stderr);
        reject(stderr);
      } else {
        console.log('Command output:', stdout);
        resolve(stdout);
      }
    });
  });
}

// بدء السيرفر
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
