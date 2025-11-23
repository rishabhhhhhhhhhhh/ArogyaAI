// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { has: isBlacklisted } = require('../utils/tokenBlacklist');

const auth = {};

auth.protect = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    }

    // check blacklist
    if (isBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Token revoked. Please login again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

auth.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient privileges' });
    }
    next();
  };
};

module.exports = auth;
