# Production Dockerfile for Wedding Gantt App
# Optimized for Coolify and Docker environments
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Set environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY server ./server
COPY public ./public

# Create data directory and grant permissions
RUN mkdir -p /data

# Expose server port
EXPOSE 3000

# Volume mount for persistent SQLite database
VOLUME ["/data"]

# Coolify / Docker healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application with native Node.js SQLite support
CMD ["node", "--experimental-sqlite", "server/index.js"]
