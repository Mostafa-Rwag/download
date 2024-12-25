from flask import Flask, render_template, request, send_file, redirect, url_for
import os
import yt_dlp

app = Flask(__name__)
DOWNLOAD_FOLDER = "downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        url = request.form.get("url")
        if not url:
            return "Invalid URL", 400

        # Generate a filename
        output_file = os.path.join(DOWNLOAD_FOLDER, "video.mp4")

        # Download video using yt-dlp
        ydl_opts = {
            "format": "bestvideo+bestaudio/best",
            "outtmpl": output_file,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            return f"An error occurred: {str(e)}", 500

        # Serve the file
        return render_template("index.html", download_link=url_for("download_file", filename="video.mp4"))
    return render_template("index.html")

@app.route("/downloads/<filename>")
def download_file(filename):
    file_path = os.path.join(DOWNLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return "File not found", 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

