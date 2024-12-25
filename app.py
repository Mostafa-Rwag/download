from flask import Flask, render_template, request, send_file
import os
from pytube import YouTube
from pytube.request import get

app = Flask(__name__)

# Custom User-Agent for Pytube to prevent 403 errors
def custom_get(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    return get(url, headers=headers)

# Route to render the index page (HTML form)
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle video download
@app.route('/download_video', methods=['POST'])
def download_video():
    video_url = request.form['video_url']
    
    try:
        # Use custom_get to bypass potential 403 errors
        yt = YouTube(video_url, on_progress_callback=custom_get)
        stream = yt.streams.filter(progressive=True, file_extension='mp4').first()
        
        # Set download file name and path
        video_file_path = os.path.join(os.getcwd(), 'downloaded_video.mp4')
        
        # Download video to the specified file path
        stream.download(output_path=os.getcwd(), filename='downloaded_video.mp4')
        
        # Send the downloaded file to the user for download
        return send_file(video_file_path, as_attachment=True, download_name='downloaded_video.mp4')

    except Exception as e:
        return str(e)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
