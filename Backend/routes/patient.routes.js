// routes/patient.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const {
  createPatient,
  getPatientById,
  getMyProfile,
  updatePatient,
  uploadImage,
  getDashboardData,
  updateMyProfile
} = require('../controllers/patient.controller');

router.post('/', auth.protect, createPatient); // create (or admin create)
router.get('/me', auth.protect, getMyProfile); // get profile for logged in user
router.get('/me/dashboard', auth.protect, getDashboardData); // get dashboard data for logged in user
router.patch('/me', auth.protect, updateMyProfile); // update profile for logged in user
router.get('/:id', auth.protect, getPatientById);
router.patch('/:id', auth.protect, updatePatient);

// upload image (multer single)
router.post('/:id/images', auth.protect, upload.single('file'), uploadImage);

module.exports = router;
