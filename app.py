import os
from flask import Flask, render_template, request, send_file
from pytube import YouTube

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
        
        # Set custom headers for the request
        yt = YouTube(video_url, on_progress_callback=progress_function, headers={"User-Agent": "Mozilla/5.0"})
        
        stream = yt.streams.get_highest_resolution()
        file_path = stream.download()
        return send_file(file_path, as_attachment=True, download_name=f"{yt.title}.mp4")
    except Exception as e:
        return f"An error occurred: {e}", 500

def progress_function(stream, chunk, bytes_remaining):
    print(f"Downloading: {stream.title}, Remaining: {bytes_remaining / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
