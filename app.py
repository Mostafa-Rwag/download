from flask import Flask, request, send_file, render_template_string
import os
import yt_dlp

app = Flask(__name__)

# Define your HTML directly in the Flask file
html_code = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Downloader</title>
</head>
<body>
    <h1>Welcome to YouTube Downloader</h1>
    <form action="/download" method="POST">
        <label for="url">YouTube URL:</label>
        <input type="text" id="url" name="url" placeholder="Enter YouTube URL" required>
        <button type="submit">Download</button>
    </form>
</body>
</html>
"""

@app.route("/")
def index():
    # Render the HTML from the string
    return render_template_string(html_code)

@app.route("/download", methods=["POST"])
def download():
    # Get the YouTube URL from the form
    youtube_url = request.form.get("url")
    if not youtube_url:
        return "Error: You must provide a YouTube URL.", 400

    # Directory to store downloaded videos
    output_dir = "downloads"
    os.makedirs(output_dir, exist_ok=True)

    try:
        # Use yt-dlp to download the video
        ydl_opts = {
            "outtmpl": os.path.join(output_dir, "%(title)s.%(ext)s"),
            "format": "bestvideo+bestaudio/best",
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            video_file = ydl.prepare_filename(info)

        # Serve the file for download
        return send_file(video_file, as_attachment=True)

    except Exception as e:
        return f"Error during download: {str(e)}", 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
