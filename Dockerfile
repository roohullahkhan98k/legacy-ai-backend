# Node.js Backend Dockerfile
FROM node:18-bullseye

# Install FFmpeg and dependencies for audio processing
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    wget \
    unzip \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Install Rhubarb Lip Sync
RUN mkdir -p /opt/rhubarb \
  && cd /opt/rhubarb \
  && wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/rhubarb-lip-sync-1.14.0-linux.tar.gz \
  && tar -xzf rhubarb-lip-sync-1.14.0-linux.tar.gz \
  && ls -la rhubarb-lip-sync-1.14.0-linux \
  && mv rhubarb-lip-sync-1.14.0-linux/rhubarb /usr/local/bin/rhubarb \
  && chmod +x /usr/local/bin/rhubarb \
  && rhubarb --version \
  && rm -rf /opt/rhubarb rhubarb-lip-sync-1.14.0-linux.tar.gz

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to resolve conflicts
RUN npm install --omit=dev --legacy-peer-deps --no-audit

# Copy application code
COPY . .

# Create uploads directory and all subdirectories
RUN mkdir -p uploads/avatars/models \
    uploads/avatars/lipsync \
    uploads/avatars/images \
    uploads/avatars/audio \
    uploads/graphservice-media \
    uploads/multimedia/images \
    uploads/multimedia/videos \
    uploads/users \
    uploads/voice-samples

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]

