const express  = require('express');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');

// ── Route imports ─────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const eventRoutes        = require('./routes/eventRoutes');
const ticketRoutes       = require('./routes/ticketRoutes');
const attendanceRoutes   = require('./routes/attendanceRoutes');
const paymentRoutes      = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const evaluationRoutes   = require('./routes/evaluationRoutes');
const userRoutes         = require('./routes/userRoutes');

const app  = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0'; // listen on all network interfaces, not just localhost,
                         // so phones on the same Wi-Fi can reach this server

// ── Middleware ────────────────────────────────────────────────
// FRONTEND_URL (e.g. http://192.168.1.23:5173) must be allowed here too —
// otherwise requests from a phone hitting the frontend's LAN address get
// blocked by CORS even though the server itself is reachable.
//
// We also need to allow ANY eventhub-*.vercel.app URL, because Vercel
// generates a new preview URL for every branch/deployment (e.g.
// eventhub-8x27-git-main-can-i.vercel.app). Hardcoding just one URL in
// FRONTEND_URL isn't enough to cover those, so we match them with a
// pattern instead of a fixed list.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const vercelPreviewPattern = /^https:\/\/eventhub[a-z0-9-]*\.vercel\.app$/;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowedStatic = allowedOrigins.includes(origin);
    const isVercelPreview = vercelPreviewPattern.test(origin);

    if (isAllowedStatic || isVercelPreview) {
      callback(null, true);
    } else {
      console.warn(`❌ Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded payment proof images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/events',        eventRoutes);
app.use('/api/tickets',       ticketRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/evaluations',   evaluationRoutes);
app.use('/api/users',         userRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   ' EventHub API is running',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server.' });
});

// ── Start Server ──────────────────────────────────────────────
// On Vercel, this file is imported by api/index.js and the app is exported
// as a serverless handler — app.listen() never runs there. Locally, it
// still starts a normal server like before.
if (!process.env.VERCEL) {
  const startServer = async () => {
    await testConnection(); // Test DB before starting

    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 EventHub server running on http://localhost:${PORT}`);
      console.log(`📡 API base: http://localhost:${PORT}/api`);
      if (process.env.FRONTEND_URL) {
        console.log(`📱 LAN access: ${process.env.FRONTEND_URL.replace(/:\d+$/, '')}:${PORT}/api`);
      }
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Free it, or set a different PORT in your .env file.`);
        process.exit(1);
      } else {
        console.error('Server startup error:', err);
        process.exit(1);
      }
    });
  };

  startServer();
}

module.exports = app;