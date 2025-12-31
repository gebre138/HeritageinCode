FROM node:18-slim

# Install BOTH the tool and the decoding libraries
RUN apt-get update && apt-get install -y \
    libchromaprint-tools \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Port 5000 is your specified port
EXPOSE 5000

# Skip npm start to get cleaner logs
CMD ["node", "dist/server.js"]