# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install the required dependencies
RUN pip install --no-cache-dir flask yt-dlp gunicorn

# Expose port 5000 for Flask
EXPOSE 8080

# Define the command to run the app
CMD ["python", "app.py"]
