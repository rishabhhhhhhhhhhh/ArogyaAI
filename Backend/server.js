// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const http = require('http');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error.middleware');
const SignalingServer = require('./services/signalingServer');

// routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const patientRoutes = require('./routes/patient.routes');
const doctorRoutes = require('./routes/doctor.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const aiAssessmentRoutes = require('./routes/aiAssessment.routes');
const healthMetricRoutes = require('./routes/healthMetric.routes');
const sessionRoutes = require('./routes/session.routes');
const chatMessageRoutes = require('./routes/chatMessage.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO integration
const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send('Server is Live!')
})

// connect DB
connectDB();

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Required for WebRTC
}));

// Enhanced CORS configuration for trusted origins
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000', // Development fallback
  'http://localhost:3001', // Alternative development port
  'http://localhost:4173', // Vite preview port
  'http://localhost:8080', // Alternative development port
  'https://localhost:5173', // HTTPS development
];

// Add production origins from environment
if (process.env.PRODUCTION_ORIGINS) {
  allowedOrigins.push(...process.env.PRODUCTION_ORIGINS.split(','));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Add request size monitoring
    if (buf.length > 10 * 1024 * 1024) { // 10MB
      console.warn(`Large request detected: ${buf.length} bytes from ${req.ip}`);
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Enhanced rate limiting for different endpoints
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 80,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for signaling endpoints
const signalingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Lower limit for signaling operations
  message: { message: 'Too many signaling requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if available, otherwise IP
    return req.user?.id || req.ip;
  }
});

// Very strict rate limiting for session creation
const sessionCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Only 10 session creations per 5 minutes
  message: { message: 'Too many session creation attempts, please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

app.use(generalLimiter);

// health
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'dev' }));

// use routes with appropriate rate limiting
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/ai-assessments', aiAssessmentRoutes);
app.use('/api/health-metrics', healthMetricRoutes);
app.use('/api/admin', adminRoutes);

// Apply stricter rate limiting to WebRTC-related endpoints
app.use('/api/sessions', sessionCreationLimiter, sessionRoutes);
app.use('/api/chat', signalingLimiter, chatMessageRoutes);

// global error handler
app.use(errorHandler);

// Initialize WebSocket signaling server
const signalingServer = new SignalingServer(server);
console.log('WebSocket signaling server initialized with automatic cleanup');

// Make signaling server accessible to controllers
app.set('signalingServer', signalingServer);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  signalingServer.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  signalingServer.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// start server (only in development, not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} - env: ${process.env.NODE_ENV || 'dev'}`);
    console.log('WebSocket signaling server initialized');
    console.log('ICE server management and monitoring enabled');
  });
}

// Export for Vercel serverless functions
module.exports = app;
