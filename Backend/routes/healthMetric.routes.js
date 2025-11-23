// routes/healthMetric.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');

const {
  createHealthMetric,
  getPatientHealthMetrics,
  getHealthTimeline
} = require('../controllers/healthMetric.controller');

router.post('/', auth.protect, createHealthMetric);
router.get('/patient/:patientId', auth.protect, getPatientHealthMetrics);
router.get('/patient/:patientId/timeline', auth.protect, getHealthTimeline);

module.exports = router;