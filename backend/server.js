const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const { testConnection } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

const vercelPattern = /^https:\/\/eventhub[a-zA-Z0-9-]*\.vercel\.app$/;

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed = allowedOrigins.includes(cleanOrigin);
      const isVercel = vercelPattern.test(cleanOrigin);
      if (isAllowed || isVercel) return callback(null, true);
      console.warn(`❌ CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.VERCEL) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EventHub API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server.',
  });
});

if (!process.env.VERCEL) {
  const startServer = async () => {
    try {
      await testConnection();
      const server = app.listen(PORT, HOST, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 API base: http://localhost:${PORT}/api`);
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is already in use.`);
          process.exit(1);
        }
        console.error('Server startup error:', err);
        process.exit(1);
      });
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  };
  startServer();
}

module.exports = app;