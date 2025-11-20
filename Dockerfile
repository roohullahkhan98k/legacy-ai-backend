# Node.js Backend Dockerfile
FROM node:18-bullseye

# Install FFmpeg for audio processing
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to resolve conflicts
RUN npm install --omit=dev --legacy-peer-deps --no-audit

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/avatars uploads/multimedia uploads/voice-samples uploads/users

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]

