from flask import Flask, render_template_string, request, send_file
import os
from pytube import YouTube
from urllib.error import HTTPError

app = Flask(__name__)

# HTML content inline (no templates folder)
index_html = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download YouTube Video</title>
</head>
<body>
    <h1>Download YouTube Video</h1>
    <form action="/download_video" method="POST">
        <label for="video_url">Enter Video URL:</label><br>
        <input type="text" id="video_url" name="video_url" placeholder="Enter YouTube URL" required><br><br>
        <button type="submit">Download</button>
    </form>
</body>
</html>
'''

# Route to render the index page (HTML form)
@app.route('/')
def index():
    return render_template_string(index_html)

# Route to handle video download
@app.route('/download_video', methods=['POST'])
def download_video():
    video_url = request.form['video_url']
    
    try:
        yt = YouTube(video_url)
        # Use a filter to get the best video stream
        stream = yt.streams.filter(file_extension='mp4', only_video=True).first()

        if not stream:
            return "No available video stream found. Please try a different video."

        # Set the download file path (downloads to current working directory)
        video_file_path = os.path.join(os.getcwd(), 'downloaded_video.mp4')

        # Download video to the specified file path
        stream.download(output_path=os.getcwd(), filename='downloaded_video.mp4')

        # Send the downloaded file to the user for download
        return send_file(video_file_path, as_attachment=True, download_name='downloaded_video.mp4')

    except HTTPError as e:
        return f"HTTP Error: {e.code} - {str(e)}"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
