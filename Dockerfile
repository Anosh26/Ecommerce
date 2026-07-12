FROM node:22-alpine

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Default command (will be overridden for specific microservices in docker-compose)
CMD ["npm", "run", "dev"]
