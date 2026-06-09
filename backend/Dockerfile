FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

EXPOSE 5001

CMD ["node", "server.js"]
