require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Helper function to fix malformed JSON
function fixMalformedJson(body) {
  if (typeof body !== 'string') return body;
  
  try {
    // First try to parse as-is
    return JSON.parse(body);
  } catch (e) {
    // Fix single quotes to double quotes
    let fixed = body.replace(/'/g, '"');
    
    // Try parsing again
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      // Add quotes around keys if missing
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
      
      try {
        return JSON.parse(fixed);
      } catch (e3) {
        // Return original if we can't fix it
        return body;
      }
    }
  }
}

// Middleware
app.use(cors({
  origin: ['https://www.fafaligroup.org', 'https://fafaligroup.org', 'https://dromorongit.github.io', 'https://dromorongit.github.io/Fafali-Group/', 'http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add CORS error handling middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Capture raw body for JSON parsing
app.use(express.json({
  limit: '10mb',
  strict: false,
  verify: (req, res, buf) => {
    const rawBody = buf.toString();
    req.rawBody = rawBody;
    
    // Try to fix malformed JSON
    const fixedBody = fixMalformedJson(rawBody);
    
    if (fixedBody !== rawBody && typeof fixedBody === 'object') {
      console.log('Successfully fixed malformed JSON');
      // Store fixed body to use instead
      req.fixedBody = fixedBody;
    }
  }
}));

// Custom JSON body parser that uses fixed body if available
app.use((req, res, next) => {
  if (req.fixedBody) {
    req.body = req.fixedBody;
  }
  next();
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Database connection with retry logic
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? '***configured***' : 'NOT SET');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000
    });
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};
connectDB();

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const applicationRoutes = require('./routes/applications');
const documentRoutes = require('./routes/documents');
const bookingRoutes = require('./routes/bookings');
const publicRoutes = require('./routes/public');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/public', publicRoutes); // Public API endpoints for website integration

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  // Handle JSON parse errors specifically
  if (err.type === 'entity.parse.failed') {
    // Get raw body from verify middleware or try to fix it
    const rawBody = req.rawBody || err.body;
    
    // Try to fix the malformed JSON
    const fixedBody = fixMalformedJson(rawBody);
    
    if (typeof fixedBody === 'object') {
      // Successfully fixed - use the fixed body
      req.body = fixedBody;
      console.log('Recovered from JSON parse error using fixed body');
      // Continue to next middleware/route
      return next();
    }
    
    // Return error with helpful message
    return res.status(400).json({
      message: 'Invalid JSON format. Please use valid JSON with double quotes around all keys and string values.',
      example: '{"applicantName":"John Doe","email":"john@example.com","visaType":"Tourist Visa","travelPurpose":"Tourism"}',
      received: rawBody ? rawBody.substring(0, 100) : 'unknown'
    });
  }
  
  console.error('Detailed error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    type: err.type,
    path: req.path,
    method: req.method
  });
  
  // Always provide detailed error for debugging
  const errorResponse = {
    message: 'Something went wrong!',
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  };
  
  res.status(500).json(errorResponse);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
