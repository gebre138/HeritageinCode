FROM node:18-slim

RUN apt-get update && apt-get install -y \
    libchromaprint-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 10000
CMD ["npm", "start"]