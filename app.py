import os
from flask import Flask, render_template, request, send_file
from pytube import YouTube

app = Flask(__name__)

# Folder where videos will be downloaded
DOWNLOAD_FOLDER = "downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

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
        file_path = stream.download(output_path=DOWNLOAD_FOLDER)
        return send_file(file_path, as_attachment=True, download_name=f"{yt.title}.mp4")
    except Exception as e:
        return f"An error occurred: {e}", 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
