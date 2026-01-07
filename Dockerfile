# Dockerfile for Fafali Group Visa Admin System

# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN cd backend && npm install
RUN cd ../frontend && npm install

# Copy all files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "backend/server.js"]