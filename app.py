from flask import Flask, render_template, request, send_file
import os
from pytube import YouTube
import requests

app = Flask(__name__,
            template_folder=os.getcwd(),  # Set the template folder to the current working directory
            static_folder=os.getcwd())    # Set the static folder to the current working directory

@app.route('/')
def index():
    return render_template('index.html')  # index.html will be in the root directory

@app.route('/download_video', methods=['POST'])
def download_video():
    video_url = request.form['video_url']
    put_url = request.form['put_url']
    
    try:
        # Download video using pytube
        yt = YouTube(video_url)
        stream = yt.streams.filter(progressive=True, file_extension='mp4').first()
        video_file = stream.download(output_path=os.getcwd(), filename="downloaded_video.mp4")

        # Upload video to a PUT URL if specified
        if put_url:
            with open(video_file, 'rb') as video:
                response = requests.put(put_url, files={'file': video})
            return f"Video uploaded to {put_url} with response: {response.status_code}"

        # Send file to the client for download
        return send_file(video_file, as_attachment=True, download_name="downloaded_video.mp4")

    except Exception as e:
        return str(e)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
