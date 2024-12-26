# Use a lightweight Node.js image
FROM node:18-slim

# Set environment variables for non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive

# Update and install required tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

COPY package*.json ./
COPY . .
RUN npm install

# Install Node.js dependencies
RUN npm install
Run apt install python3
# Expose port 3000
EXPOSE 3000

# Command to start the server
CMD ["node", "server.js"]

