from flask import Flask, request, jsonify, render_template, send_file
from pytube import YouTube
import os
import tempfile
import requests

app = Flask(__name__)

# Function to download the video using pytube
def download_video(video_url):
    try:
        yt = YouTube(video_url)
        stream = yt.streams.get_highest_resolution()
        print(f"Downloading {yt.title}...")

        # Create a temporary file for the video
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        
        # Download the video to the temporary file
        stream.download(output_path=os.path.dirname(temp_file.name), filename=temp_file.name.split(os.sep)[-1])

        print(f"Video downloaded: {yt.title}")
        return temp_file.name, yt.title
    except Exception as e:
        print(f"An error occurred: {e}")
        return None, f"Error occurred: {str(e)}"

# Function to make the PUT request
def make_put_request(url, data):
    try:
        response = requests.put(url, json=data)
        if response.status_code == 200:
            return "PUT request successful"
        else:
            return f"Failed to make PUT request. Status code: {response.status_code}"
    except Exception as e:
        print(f"An error occurred during PUT request: {e}")
        return f"Error during PUT request: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download_video', methods=['POST'])
def download_and_put():
    data = request.json
    video_url = data.get('video_url')
    put_url = data.get('put_url')
    put_data = data.get('put_data')

    if not video_url or not put_url or not put_data:
        return jsonify({"error": "Missing required parameters"}), 400

    # Download the video
    video_file, video_title = download_video(video_url)

    if video_file is None:
        return jsonify({"download_message": video_title, "put_message": "No PUT request made."}), 500

    # Make the PUT request
    put_message = make_put_request(put_url, put_data)

    # Send the video file to the client for download
    return send_file(video_file, as_attachment=True, download_name=video_title + ".mp4")

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=8080)
