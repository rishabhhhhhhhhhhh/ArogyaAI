// routes/appointment.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { createAppointment, getAppointment, updateAppointment, getMyAppointments, joinAppointment, rescheduleAppointment, cancelAppointment } = require('../controllers/appointment.controller');

router.post('/', auth.protect, createAppointment);
router.get('/me', auth.protect, getMyAppointments);
router.get('/:id', auth.protect, getAppointment);
router.patch('/:id', auth.protect, updateAppointment);
router.post('/:id/join', auth.protect, joinAppointment);
router.patch('/:id/reschedule', auth.protect, rescheduleAppointment);
router.patch('/:id/cancel', auth.protect, cancelAppointment);

module.exports = router;
