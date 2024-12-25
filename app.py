from flask import Flask, request, render_template, jsonify
from pytube import YouTube
import requests
import os
from PIL import Image
import torch
import torchvision.transforms as transforms
from torchvision import models

app = Flask(__name__)

# Load your AI model for skin disease detection
model = models.resnet18(pretrained=True)
model.eval()

# Function to download video using pytube
def download_video(url, output_path='./'):
    try:
        yt = YouTube(url)
        stream = yt.streams.get_highest_resolution()
        print(f"Downloading {yt.title}...")
        stream.download(output_path)
        print(f"Download complete! Video saved to {output_path}")
        return f"Video downloaded successfully: {yt.title}"
    except Exception as e:
        print(f"An error occurred: {e}")
        return f"Error occurred: {str(e)}"

# Function to make a PUT request using requests
def make_put_request(url, data):
    try:
        response = requests.put(url, data=data)
        if response.status_code == 200:
            return "PUT request successful"
        else:
            return f"Failed to make PUT request. Status code: {response.status_code}"
    except Exception as e:
        print(f"An error occurred during PUT request: {e}")
        return f"Error during PUT request: {str(e)}"

# Function to preprocess image and detect skin disease
def detect_skin_disease(image_path):
    image = Image.open(image_path).convert("RGB")
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    image = transform(image).unsqueeze(0)
    with torch.no_grad():
        output = model(image)
    _, predicted_class = torch.max(output, 1)
    class_names = ["Healthy", "Disease A", "Disease B"]
    predicted_label = class_names[predicted_class.item()]
    return predicted_label

# Route to render the index page
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle image upload and disease detection
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image = request.files['image']
    image_path = os.path.join('./uploads', image.filename)
    image.save(image_path)
    disease_prediction = detect_skin_disease(image_path)
    return jsonify({"predicted_disease": disease_prediction})

# Route to handle video download and PUT request
@app.route('/download_video', methods=['POST'])
def download_and_put():
    data = request.json
    video_url = data.get('video_url')
    put_url = data.get('put_url')
    put_data = data.get('put_data')

    if not video_url or not put_url or not put_data:
        return jsonify({"error": "Missing required parameters"}), 400

    download_message = download_video(video_url)
    put_message = make_put_request(put_url, put_data)

    return jsonify({
        "download_message": download_message,
        "put_message": put_message
    })

if __name__ == "__main__":
    if not os.path.exists('./uploads'):
        os.makedirs('./uploads')
    app.run(debug=True)
