// Run this ONCE to generate your VAPID keys for Web Push
// Command: node generate-vapid.js
// Then copy the keys into your .env file

const webpush = require('web-push');
const keys    = webpush.generateVAPIDKeys();

console.log('\n🔑 VAPID Keys Generated!\n');
console.log('Copy these into your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\n⚠️  Keep your PRIVATE key secret. Never share it.\n');