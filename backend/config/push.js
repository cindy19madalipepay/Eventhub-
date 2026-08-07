const webpush = require('web-push');
require('dotenv').config();

const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@eventhub.local';

// Set VAPID details for Web Push Notifications
webpush.setVapidDetails(
  vapidEmail,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = webpush;