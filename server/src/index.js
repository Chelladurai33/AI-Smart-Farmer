require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const predictionRoutes = require('./routes/prediction.routes');
const forecastRoutes = require('./routes/forecast.routes');
const diseaseRoutes = require('./routes/disease.routes');
const coldStorageRoutes = require('./routes/coldStorage.routes');
const weatherRoutes = require('./routes/weather.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Trust proxy (required for Render / reverse proxies) ──────────────────────
app.set('trust proxy', 1);

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    // Also allow any .vercel.app origin or origins explicitly listed in CLIENT_URL
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request logging (production: combined; development: dev) ─────────────────
app.use(morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream: { write: (msg) => logger.info(msg.trim()) } }
));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
app.use(generalLimiter);

// ─── Health check ──────────────────────────────────────────────────────────────
const healthHandler = (_req, res) => {
  res.json({
    status: 'ok',
    success: true,
    message: 'AI Farmer Marketplace API is running 🌱',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/disease-detection', diseaseRoutes);
app.use('/api/cold-storage', coldStorageRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', data: null, error: 'NOT_FOUND' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
  // Force shutdown after 10 s
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Uncaught exception / rejection guards ────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  // Do NOT crash – log and continue
});

module.exports = app;
