import os
import requests
from flask import Flask, render_template, request, send_file
from pytube import YouTube
from pytube.request import get, put

# Create a custom function to override the default headers in requests
def custom_requests_get(url, headers=None, *args, **kwargs):
    if headers is None:
        headers = {}
    headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"})
    return get(url, headers=headers, *args, **kwargs)

# Replace the default get method with our custom one
YouTube._request = custom_requests_get

app = Flask(__name__, template_folder=".")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/download", methods=["POST"])
def download_video():
    try:
        video_url = request.form.get("url")
        if not video_url:
            return "Error: No URL provided", 400
        
        yt = YouTube(video_url)

        stream = yt.streams.get_highest_resolution()
        file_path = stream.download()

        return send_file(file_path, as_attachment=True, download_name=f"{yt.title}.mp4")
    except Exception as e:
        return f"An error occurred: {e}", 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
