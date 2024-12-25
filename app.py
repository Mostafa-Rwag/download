from flask import Flask, render_template_string, request, send_file
from pytube import YouTube
import os

app = Flask(__name__)

# HTML Form for the home page (index)
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

@app.route('/')
def index():
    return render_template_string(index_html)

@app.route('/download_video', methods=['POST'])
def download_video():
    video_url = request.form['video_url']
    
    try:
        yt = YouTube(video_url)
        # Select the best stream (mp4, resolution)
        stream = yt.streams.filter(progressive=True, file_extension='mp4').first()
        
        if not stream:
            return "No suitable video stream found. Try a different URL."
        
        # Temporary path to download the video to
        download_path = os.path.join(os.getcwd(), "downloaded_video.mp4")
        
        # Download the video to the current working directory
        stream.download(output_path=os.getcwd(), filename="downloaded_video.mp4")
        
        # Send the downloaded video to the client for download
        return send_file(download_path, as_attachment=True, download_name="downloaded_video.mp4")
    
    except Exception as e:
        return f"An error occurred: {str(e)}"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
