// utils/tokenBlacklist.js
// Simple in-memory blacklist with TTL. NOT for production (process memory).
// Use Redis or a persistent store for production.

const blacklist = new Map(); // token -> expiry (ms since epoch)

function add(token, ttlSeconds = 3600) {
  try {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    blacklist.set(token, expiresAt);
    // schedule cleanup
    setTimeout(() => {
      if (blacklist.get(token) && blacklist.get(token) <= Date.now()) {
        blacklist.delete(token);
      }
    }, ttlSeconds * 1000 + 500);
    return true;
  } catch (err) {
    console.error('Blacklist add error', err);
    return false;
  }
}

function has(token) {
  const expiresAt = blacklist.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    blacklist.delete(token);
    return false;
  }
  return true;
}

module.exports = { add, has };
