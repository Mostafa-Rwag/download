# Use a lightweight Node.js image
FROM node:18-slim

# Install yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Install Node.js dependencies
RUN npm install express

# Expose port 3000
EXPOSE 3000

# Command to start the server
CMD ["node", "server.js"]
