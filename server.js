<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Downloader</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f4f9;
        }
        .container {
            text-align: center;
            padding: 30px;
            background-color: white;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            border-radius: 10px;
        }
        input[type="url"] {
            padding: 10px;
            width: 300px;
            margin-bottom: 10px;
            border-radius: 5px;
            border: 1px solid #ccc;
        }
        select {
            padding: 10px;
            width: 320px;
            margin-bottom: 20px;
            border-radius: 5px;
            border: 1px solid #ccc;
        }
        button {
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background-color: #0056b3;
        }
        .error {
            color: red;
        }
        iframe {
            width: 100%;
            max-width: 600px;
            height: 350px;
            border: none;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Video Downloader</h1>
        <form id="downloadForm">
            <input type="url" id="videoUrl" placeholder="Enter YouTube URL" required><br><br>
            <!-- Embed YouTube preview here -->
            <iframe id="videoPreview" src="" title="YouTube video preview"></iframe><br><br>
            <select id="qualitySelect" required>
                <option value="">Select Quality</option>
            </select><br><br>
            <button type="submit">Download Video</button>
        </form>
        <div class="error" id="errorMessage"></div>
    </div>

    <script>
        document.getElementById('downloadForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            const url = document.getElementById('videoUrl').value;
            const quality = document.getElementById('qualitySelect').value;

            if (!url || !quality) {
                document.getElementById('errorMessage').textContent = 'Please provide a valid URL and select a quality.';
                return;
            }

            try {
                const response = await fetch(`/download?url=${encodeURIComponent(url)}&quality=${encodeURIComponent(quality)}`);
                if (response.ok) {
                    // Triggering the download of the video
                    const blob = await response.blob();
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'video.mp4';
                    link.click();
                } else {
                    const data = await response.json();
                    document.getElementById('errorMessage').textContent = data.error || 'Error occurred during download.';
                }
            } catch (error) {
                document.getElementById('errorMessage').textContent = 'Error occurred during download.';
                console.error(error);
            }
        });

        async function fetchFormats() {
            const url = document.getElementById('videoUrl').value;
            if (!url) return;

            try {
                const response = await fetch('/get-formats', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url })
                });

                const data = await response.json();
                const qualitySelect = document.getElementById('qualitySelect');
                qualitySelect.innerHTML = '<option value="">Select Quality</option>'; // Clear previous options

                data.formats.forEach(format => {
                    const option = document.createElement('option');
                    let formatDescription = format.description;

                    // Display the quality in the desired format (e.g., 144p, 480p, etc.)
                    if (formatDescription.includes('audio')) {
                        formatDescription = 'Audio Only';  // Show "Audio Only" for audio formats
                    }
                    
                    option.value = format.code;
                    option.textContent = formatDescription;
                    qualitySelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error fetching formats:', error);
            }
        }

        // Fetch formats when the URL input is filled
        document.getElementById('videoUrl').addEventListener('input', fetchFormats);

        // Update the video preview when the URL is entered
        document.getElementById('videoUrl').addEventListener('input', () => {
            const url = document.getElementById('videoUrl').value;
            const videoPreview = document.getElementById('videoPreview');

            // Check if the URL is a valid YouTube URL and update the preview
            if (url && url.includes('youtube.com')) {
                // Extract the video ID from the URL
                const videoId = url.split('v=')[1]?.split('&')[0]; // Get the video ID after "v="
                if (videoId) {
                    videoPreview.src = `https://www.youtube.com/embed/${videoId}`;
                } else {
                    videoPreview.src = ''; // Clear the preview if the video ID is not found
                }
            } else {
                videoPreview.src = ''; // Clear the preview if the URL is not valid
            }
        });
    </script>
</body>
</html>
