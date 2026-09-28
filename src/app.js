const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// CORS setup supporting credentials (cookies & authorization headers)
const configuredOrigin = (process.env.CORS_ORIGIN || '').replace(/\/+$/, '');
const allowedOrigins = [
  configuredOrigin,
  'http://localhost:5000',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5000'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or from allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // For dev flexibility, permit local origins
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Body parsers & cookie parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Connect to DB if not yet connected (essential for serverless platforms like Vercel)
const connectDB = require('./config/db');
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('API DB Connection error:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please ensure MongoDB Atlas IP whitelist (0.0.0.0/0) is configured.',
      error: err.message
    });
  }
});

// Mount API routes
app.use('/api', apiRoutes);

// Fallback for SPA routing to index.html (if not an API request)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
