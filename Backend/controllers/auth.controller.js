// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { add: addToBlacklist } = require('../utils/tokenBlacklist');

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// existing register/login functions remain (keep your current implementations)...
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email & password required' });

    // Determine final role
    let finalRole = 'patient';

    // If the request is authenticated and the authenticated user is admin, allow specifying any role
    if (req.user && req.user.role === 'admin' && role) {
      if (['patient', 'doctor', 'admin'].includes(role)) finalRole = role;
    } else if (role) {
      // For public registration, allow patient and doctor roles only
      if (['patient', 'doctor'].includes(role)) {
        finalRole = role;
      } else if (role === 'admin') {
        // Explicitly reject admin role for public registration
        return res.status(403).json({ success: false, message: 'Cannot create admin user via public register' });
      }
    }

    // Prevent creation of an admin via public registration
    if (finalRole === 'admin' && !(req.user && req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Cannot create admin user via public register' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: 'User already exists' });

    user = await User.create({ email, password, name, role: finalRole });

    // Create appropriate profile based on role
    if (finalRole === 'patient') {
      await Patient.create({ userId: user._id, firstName: name || 'Patient' });
    } else if (finalRole === 'doctor') {
      const Doctor = require('../models/Doctor');
      await Doctor.create({ 
        userId: user._id, 
        firstName: name ? name.split(' ')[0] : 'Doctor',
        lastName: name ? name.split(' ').slice(1).join(' ') : '',
        verified: false // Doctors need verification
      });
    }

    const token = createToken(user);
    res.status(201).json({ 
      success: true, 
      data: { 
        token, 
        user: { 
          id: user._id, 
          email: user.email, 
          role: user.role,
          name: user.name 
        } 
      } 
    });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email & password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const matched = await user.matchPassword(password);
    if (!matched) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = createToken(user);
    res.json({ success: true, data: { token, user: { id: user._id, email: user.email, role: user.role } } });
  } catch (err) { next(err); }
};
// Logout controller: blacklist current access token (demo)
exports.logout = async (req, res, next) => {
  try {
    // Get token from header or cookie
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(200).json({ success: true, message: 'Logged out' });
    }

    // decode to get remaining TTL (optional). We'll safely blacklist for configured TTL (e.g., 1 day)
    // For demo: use TTL of 24 hours (86400 sec) or derived from token expiry if you want.
    let ttl = 24 * 60 * 60; // 1 day

    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const nowSec = Math.floor(Date.now() / 1000);
        const remaining = decoded.exp - nowSec;
        if (remaining > 0) ttl = remaining;
      }
    } catch (e) {
      // ignore
    }

    addToBlacklist(token, ttl);

    // Optionally clear cookie if you set token cookie
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};
