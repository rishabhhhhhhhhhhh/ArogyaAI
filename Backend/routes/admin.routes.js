// routes/admin.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

// all routes protected and restricted to admin
router.use(auth.protect);
router.use(auth.restrictTo('admin'));

// users
router.get('/users', adminController.listUsers);
router.post('/promote/:userId', adminController.promoteToAdmin);
router.delete('/users/:userId', adminController.deleteUser);

// doctors verification
router.get('/doctors/pending', adminController.listPendingDoctors);
router.post('/doctors/verify/:doctorId', adminController.verifyDoctor);

module.exports = router;
