FROM node:20-slim

# Install LibreOffice and standard dependencies for headless runs
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-impress \
    libreoffice-calc \
    libreoffice-draw \
    fonts-dejavu \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production --ignore-scripts

# Copy necessary files
COPY scripts/ ./scripts/

ENV PORT=8080
EXPOSE 8080

CMD ["node", "scripts/conversion-server.js"]
