const mysql = require('mysql2/promise');
require('dotenv').config();

const isDevelopment = (process.env.NODE_ENV || 'development').toLowerCase() === 'development';

// Create a connection pool (better than single connection for multiple requests)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eventhub_db',
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 2000),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Aiven (and most cloud MySQL hosts) require SSL. Set DB_SSL=true in your
  // Vercel/production env vars. Leave unset locally to keep using WAMP as-is.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// Test the connection on startup, but keep the server running in development mode.
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log('✅ MySQL connected successfully');
  } catch (error) {
    const message = error?.message || 'Unknown MySQL connection error';
    console.warn(`⚠️ MySQL connection failed: ${message}`);

    if (!isDevelopment) {
      process.exit(1);
    }
  }
};

module.exports = { pool, testConnection };