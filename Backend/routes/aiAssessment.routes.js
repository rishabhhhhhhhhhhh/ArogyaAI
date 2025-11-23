// routes/aiAssessment.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');

const {
  createAssessment,
  getPatientAssessments,
  getAssessmentById,
  analyzeSymptoms
} = require('../controllers/aiAssessment.controller');

// Test endpoint for debugging
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'AI Assessment API is working!',
    timestamp: new Date().toISOString()
  });
});

router.post('/analyze', analyzeSymptoms); // Public endpoint for AI analysis
router.post('/', auth.protect, createAssessment);
router.get('/patient/:patientId', auth.protect, getPatientAssessments);
router.get('/:id', auth.protect, getAssessmentById);

module.exports = router;