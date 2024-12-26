// Route to get video formats (quality options)
app.post('/get-formats', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // yt-dlp command to get video formats
    const command = `yt-dlp -F ${url}`;

    try {
        const result = await new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    reject(`Error fetching formats: ${stderr}`);
                } else {
                    resolve(stdout);
                }
            });
        });

        // Filter formats (144p, 480p, 640p, 720p, 1080p, and audio)
        const qualityOptions = ['144', '480', '640', '720', '1080', 'audio'];
        const formats = result
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('Format code'))
            .map(line => {
                const parts = line.trim().split(/\s{2,}/);
                return { code: parts[0], description: parts.slice(1).join(' ') };
            })
            .filter(format => qualityOptions.some(option => format.description.includes(option)));

        res.status(200).json({ formats });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch formats', message: error });
    }
});
