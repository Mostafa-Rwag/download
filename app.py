import os
from flask import Flask, render_template, request, send_file
from pytube import YouTube
import os

app = Flask(__name__)

DOWNLOAD_FOLDER = "downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/download", methods=["POST"])
def download_video():
    try:
        video_url = request.form.get("url")
        yt = YouTube(video_url)
        stream = yt.streams.get_highest_resolution()
        file_path = stream.download(output_path=DOWNLOAD_FOLDER)
        return send_file(file_path, as_attachment=True, download_name=f"{yt.title}.mp4")
    except Exception as e:
        return f"An error occurred: {e}"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
