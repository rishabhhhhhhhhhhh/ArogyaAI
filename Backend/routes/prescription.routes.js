// routes/prescription.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { createPrescription, getPrescription, getMyPrescriptions } = require('../controllers/prescription.controller');

router.post('/', auth.protect, auth.restrictTo('doctor','admin'), createPrescription);
router.get('/me', auth.protect, getMyPrescriptions);
router.get('/:id', auth.protect, getPrescription);

module.exports = router;
