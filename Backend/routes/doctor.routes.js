// routes/doctor.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { 
  createDoctor, 
  getDoctor, 
  updateDoctor, 
  getMyProfile, 
  getDashboardData, 
  getPatientQueue, 
  getAnalytics,
  getAllDoctors,
  submitVerification,
  getVerificationStatus
} = require('../controllers/doctor.controller');

// Doctor profile routes
router.get('/me', auth.protect, auth.restrictTo('doctor'), getMyProfile);
router.patch('/me', auth.protect, auth.restrictTo('doctor'), updateDoctor);

// Doctor verification routes
router.post('/verification/submit', auth.protect, auth.restrictTo('doctor'), submitVerification);
router.get('/verification/status', auth.protect, auth.restrictTo('doctor'), getVerificationStatus);

// Doctor dashboard routes
router.get('/dashboard', auth.protect, auth.restrictTo('doctor'), getDashboardData);
router.get('/queue', auth.protect, auth.restrictTo('doctor'), getPatientQueue);
router.get('/analytics', auth.protect, auth.restrictTo('doctor'), getAnalytics);

// Public routes for patients to view doctors
router.get('/', auth.protect, getAllDoctors);

// Admin/general routes
router.post('/', auth.protect, auth.restrictTo('admin', 'doctor'), createDoctor);
router.get('/:id', auth.protect, getDoctor);
router.patch('/:id', auth.protect, auth.restrictTo('doctor','admin'), updateDoctor);

module.exports = router;
