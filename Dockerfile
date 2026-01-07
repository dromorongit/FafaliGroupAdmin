# Dockerfile for Fafali Group Visa Admin System

# Use official Node.js image (not alpine to avoid bcrypt issues)
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Copy all files
COPY . .

# Install dependencies
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Build frontend
RUN cd frontend && npm run build

# Expose port
EXPOSE 5000

# Start the application
ENV NODE_ENV=production
CMD ["node", "backend/server.js"]