const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const authRoutes = require('./routes/authRoutes');
const notesRoutes = require('./routes/notesRoutes');

const app = express();

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Semantic Note Finder API is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

module.exports = app;
