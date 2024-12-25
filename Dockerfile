# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the application files to the container
COPY . /app

# Install required Python packages
RUN pip install --no-cache-dir flask pytube

# Expose port 5000 for Flask
EXPOSE 5000

# Set the default command to run the application
CMD ["python", "app.py"]
