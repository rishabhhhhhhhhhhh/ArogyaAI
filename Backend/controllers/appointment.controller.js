// controllers/appointment.controller.js
const Appointment = require('../models/Appointment');

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctorId, scheduledAt, mode, reason, notes } = req.body;
    
    // Get patient profile
    const Patient = require('../models/Patient');
    const patient = await Patient.findOne({ userId: req.user._id });
    
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    // Verify doctor exists
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Create appointment
    const appointmentData = {
      patient: patient._id,
      doctor: doctorId,
      scheduledAt: new Date(scheduledAt),
      mode: mode || 'video',
      reason: reason || 'General consultation',
      notes: notes || '',
      status: 'scheduled',
      createdBy: req.user._id
    };

    const appointment = await Appointment.create(appointmentData);
    
    // Populate the created appointment
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctor', 'firstName lastName specialization profileImage')
      .populate('patient', 'firstName lastName email phone');

    res.status(201).json({ 
      success: true, 
      data: populatedAppointment,
      message: 'Appointment booked successfully' 
    });
  } catch (err) { 
    next(err); 
  }
};

exports.getAppointment = async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id).populate('patient doctor');
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
};

exports.getMyAppointments = async (req, res, next) => {
  try {
    let query = {};
    
    // Check if user is patient or doctor
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ userId: req.user._id });
      
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient profile not found' });
      }
      query.patient = patient._id;
    } else if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findOne({ userId: req.user._id });
      
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      query.doctor = doctor._id;
    }

    const { page = 1, limit = 10, status, upcoming } = req.query;
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter upcoming appointments
    if (upcoming === 'true') {
      query.scheduledAt = { $gte: new Date() };
    }

    const appointments = await Appointment.find(query)
      .populate('doctor', 'firstName lastName specialization profileImage')
      .populate('patient', 'firstName lastName profileImage')
      .sort({ scheduledAt: upcoming === 'true' ? 1 : -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Appointment.countDocuments(query);

    // Format appointments for frontend
    const formattedAppointments = appointments.map(apt => ({
      id: apt._id,
      doctor: {
        name: `Dr. ${apt.doctor?.firstName} ${apt.doctor?.lastName}`,
        specialty: apt.doctor?.specialization || 'General Physician',
        avatar: apt.doctor?.profileImage
      },
      patient: apt.patient ? {
        name: `${apt.patient.firstName} ${apt.patient.lastName}`,
        avatar: apt.patient.profileImage
      } : null,
      scheduledAt: apt.scheduledAt,
      status: apt.status,
      mode: apt.mode,
      reason: apt.reason,
      notes: apt.notes,
      createdAt: apt.createdAt,
      sessionId: apt._id // Use appointment ID as session ID for video calls
    }));

    res.json({
      success: true,
      data: formattedAppointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.joinAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'firstName lastName specialization')
      .populate('patient', 'firstName lastName');
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Check if user is authorized to join this appointment
    let isAuthorized = false;
    
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ userId: req.user._id });
      isAuthorized = patient && appointment.patient._id.toString() === patient._id.toString();
    } else if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findOne({ userId: req.user._id });
      isAuthorized = doctor && appointment.doctor._id.toString() === doctor._id.toString();
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to join this appointment' });
    }

    // Time restriction disabled for development
    // In production, you might want to enable this check:
    /*
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledAt);
    const timeDiff = Math.abs(now.getTime() - appointmentTime.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // Allow joining 30 minutes before to 2 hours after scheduled time
    if (hoursDiff > 2.5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Appointment can only be joined within 30 minutes before to 2 hours after scheduled time' 
      });
    }
    */

    // Create or find existing session for this appointment
    const Session = require('../models/Session');
    let session = await Session.findOne({ 
      sessionId: appointmentId 
    });

    if (!session) {
      // Get the User IDs for doctor and patient
      const Doctor = require('../models/Doctor');
      const Patient = require('../models/Patient');
      
      const doctorProfile = await Doctor.findById(appointment.doctor._id);
      const patientProfile = await Patient.findById(appointment.patient._id);
      
      if (!doctorProfile || !patientProfile) {
        return res.status(400).json({ 
          success: false, 
          message: 'Doctor or patient profile not found' 
        });
      }

      try {
        // Create new session with User IDs (not profile IDs)
        session = new Session({
          sessionId: appointmentId,
          doctorId: doctorProfile.userId, // Store User ID, not Doctor profile ID
          patientId: patientProfile.userId, // Store User ID, not Patient profile ID
          status: 'created',
          metadata: {
            appointmentId: appointmentId,
            participantCount: 0
          }
        });
        await session.save();
        console.log(`Created new session for appointment ${appointmentId}`);
      } catch (sessionError) {
        // If duplicate key error, try to find the existing session again
        if (sessionError.code === 11000) {
          console.log(`Session already exists for appointment ${appointmentId}, fetching existing session`);
          session = await Session.findOne({ sessionId: appointmentId });
          if (!session) {
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to create or find session' 
            });
          }
        } else {
          throw sessionError;
        }
      }
    } else {
      console.log(`Found existing session for appointment ${appointmentId}`);
    }

    // Update appointment status to 'in_progress' if it's scheduled
    if (appointment.status === 'scheduled') {
      appointment.status = 'in_progress';
      await appointment.save();
    }

    // Return session information for video call
    res.json({
      success: true,
      data: {
        sessionId: appointmentId,
        appointment: {
          id: appointment._id,
          scheduledAt: appointment.scheduledAt,
          mode: appointment.mode,
          reason: appointment.reason,
          doctor: {
            name: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
            specialization: appointment.doctor.specialization
          },
          patient: {
            name: appointment.patient.lastName 
              ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
              : appointment.patient.firstName || 'Patient'
          }
        },
        userRole: req.user.role,
        isInitiator: req.user.role === 'doctor' // Doctor initiates the call
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const { scheduledAt, reason } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'New scheduled time is required' 
      });
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'firstName lastName specialization')
      .populate('patient', 'firstName lastName');
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Check if user is authorized to reschedule this appointment
    let isAuthorized = false;
    
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ userId: req.user._id });
      isAuthorized = patient && appointment.patient._id.toString() === patient._id.toString();
    } else if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findOne({ userId: req.user._id });
      isAuthorized = doctor && appointment.doctor._id.toString() === doctor._id.toString();
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to reschedule this appointment' });
    }

    // Check if appointment can be rescheduled (only scheduled appointments)
    if (appointment.status !== 'scheduled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only scheduled appointments can be rescheduled' 
      });
    }

    // Validate new scheduled time (must be in the future)
    const newScheduledTime = new Date(scheduledAt);
    const now = new Date();
    
    if (newScheduledTime <= now) {
      return res.status(400).json({ 
        success: false, 
        message: 'New scheduled time must be in the future' 
      });
    }

    // Update appointment
    const oldScheduledAt = appointment.scheduledAt;
    appointment.scheduledAt = newScheduledTime;
    appointment.notes = reason ? `${appointment.notes || ''}\n\nRescheduled: ${reason}`.trim() : appointment.notes;
    appointment.updatedAt = now;
    
    await appointment.save();

    // Log the reschedule action
    console.log(`Appointment ${appointmentId} rescheduled by ${req.user.role} ${req.user.email} from ${oldScheduledAt} to ${newScheduledTime}`);

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        id: appointment._id,
        scheduledAt: appointment.scheduledAt,
        oldScheduledAt: oldScheduledAt,
        status: appointment.status,
        notes: appointment.notes
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const { reason } = req.body;

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'firstName lastName specialization')
      .populate('patient', 'firstName lastName');
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Check if user is authorized to cancel this appointment
    let isAuthorized = false;
    
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ userId: req.user._id });
      isAuthorized = patient && appointment.patient._id.toString() === patient._id.toString();
    } else if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findOne({ userId: req.user._id });
      isAuthorized = doctor && appointment.doctor._id.toString() === doctor._id.toString();
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' });
    }

    // Check if appointment can be cancelled (only scheduled or in_progress appointments)
    if (!['scheduled', 'in_progress'].includes(appointment.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Only scheduled or in-progress appointments can be cancelled' 
      });
    }

    // Update appointment status to cancelled
    const oldStatus = appointment.status;
    appointment.status = 'cancelled';
    appointment.notes = reason ? `${appointment.notes || ''}\n\nCancelled: ${reason}`.trim() : appointment.notes;
    appointment.updatedAt = new Date();
    
    await appointment.save();

    // End any active session for this appointment
    const Session = require('../models/Session');
    await Session.updateMany(
      { 'metadata.appointmentId': appointmentId, status: { $in: ['created', 'active'] } },
      { 
        status: 'ended',
        endedAt: new Date(),
        'metadata.cancellationReason': reason || 'Appointment cancelled'
      }
    );

    // Log the cancellation
    console.log(`Appointment ${appointmentId} cancelled by ${req.user.role} ${req.user.email}. Previous status: ${oldStatus}`);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: {
        id: appointment._id,
        status: appointment.status,
        cancelledAt: appointment.updatedAt,
        reason: reason || null,
        notes: appointment.notes
      }
    });
  } catch (err) {
    next(err);
  }
};
