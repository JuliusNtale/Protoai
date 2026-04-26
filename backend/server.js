require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { createTransporter } = require('./config/mailer');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const sessionRoutes = require('./routes/sessions');
const reportRoutes = require('./routes/reports');
const imageRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logger — never logs Authorization header or password fields
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'proctoring-backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);

// Middleware smoke-test route (dev only)
if (process.env.NODE_ENV !== 'production') {
  const { verifyToken } = require('./middleware/auth');
  const { requireRole } = require('./middleware/role');
  app.get('/api/test-admin', verifyToken, requireRole(['administrator']), (req, res) => {
    res.json({ ok: true, user: req.user });
  });
  app.get('/api/test-auth', verifyToken, (req, res) => {
    res.json({ ok: true, user: req.user });
  });
}
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/images', imageRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Global error handler — never leaks stack traces
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    }
  });
});

async function start() {
  try {
    await createTransporter();
    app.listen(PORT, () => {
      logger.info(`Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { stack: err.stack });
    process.exit(1);
  }
}

start();

module.exports = app;
