// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', auth.protect, logout); // require token to be present to blacklist it

module.exports = router;
