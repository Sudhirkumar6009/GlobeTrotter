require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./conn');

const app = express();
// --- Simplified permissive CORS for local development ONLY ---
// Allows any origin while still supporting credentials.
// DO NOT deploy this exact config to production.
app.use(cors());

// Manual OPTIONS handler (no wildcard pattern to satisfy Express 5)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const reqOrigin = req.headers.origin;
    if (reqOrigin) res.header('Access-Control-Allow-Origin', reqOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    return res.sendStatus(204);
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom MongoDB injection sanitization middleware for Express v5
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (/^\$/.test(key) || /\./.test(key)) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
    return obj;
  };

  // Sanitize body and params (query is read-only in Express v5)
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);

  next();
};

// Essential middleware
app.use(helmet());
app.use(sanitizeInput); // Use custom sanitization

// Rate limiting (configurable / disable-able for local dev)
// Set DISABLE_RATE_LIMIT=true to turn off. Override limits with RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS.
if (process.env.DISABLE_RATE_LIMIT !== 'true') {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10);
  const max = parseInt(
    process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'production' ? '500' : '5000'),
    10
  );
  app.use(
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests, please try again later.',
      skip: () => process.env.NODE_ENV !== 'production' && process.env.ENABLE_STRICT_RATE_LIMIT !== 'true',
    })
  );
}

// Connect to MongoDB
connectDB();

// Import routes
const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const activityRoutes = require('./routes/activityRoutes');
// + AI routes
const aiRoutes = require('./routes/aiRoutes');

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/ai', aiRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler (Express 5 uses path-to-regexp v6 which disallows bare '*')
// Using no path matches everything that reaches this point.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Expected client env VITE_API_BASE_URL pointing to:', `http://localhost:${PORT}`);
});

module.exports = app;
