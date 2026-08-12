const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const { testConnection } = require('./config/db');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';

/* ============================================================
   CORS
============================================================ */
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

/* ============================================================
   ROUTES — with explicit error handling so a missing file
   doesn't silently kill the whole API
============================================================ */
function safeRequire(routePath, mountPath) {
  try {
    const route = require(routePath);
    app.use(mountPath, route);
    console.log(`✅ Mounted ${mountPath}`);
  } catch (err) {
    console.error(`❌ FAILED to mount ${mountPath}:`, err.message);
    // Mount a fallback so the client gets a clear error instead of 404
    app.use(mountPath, (req, res) => res.status(500).json({
      success: false,
      message: `Server misconfiguration: ${mountPath} route failed to load.`,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    }));
  }
}

safeRequire('./routes/authRoutes', '/api/auth');
safeRequire('./routes/eventRoutes', '/api/events');
safeRequire('./routes/ticketRoutes', '/api/tickets');
safeRequire('./routes/attendanceRoutes', '/api/attendance');
safeRequire('./routes/paymentRoutes', '/api/payments');
safeRequire('./routes/notificationRoutes', '/api/notifications');
safeRequire('./routes/evaluationRoutes', '/api/evaluations');
safeRequire('./routes/userRoutes', '/api/users');

/* ============================================================
   DEBUG: List all registered routes
============================================================ */
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const method = Object.keys(handler.route.methods).join(',').toUpperCase();
          const path = handler.route.path;
          routes.push(`${method} ${middleware.regexp.toString().replace('\\/?(?=\\/|$)', '').replace('(?:\\/(?=$))', '').replace(/^\^\\/, '').replace(/\\\/\?\$$/, '')}${path}`);
        }
      });
    }
  });
  res.json({ success: true, routes });
});

/* ============================================================
   HEALTH CHECK
============================================================ */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EventHub API is running',
    timestamp: new Date().toISOString(),
  });
});

/* ============================================================
   404
============================================================ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

/* ============================================================
   ERROR HANDLER
============================================================ */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server.',
  });
});

/* ============================================================
   LOCAL SERVER
============================================================ */
if (!process.env.VERCEL) {
  const startServer = async () => {
    try {
      await testConnection();
      const server = app.listen(PORT, HOST, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
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