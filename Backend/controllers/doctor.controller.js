// controllers/doctor.controller.js
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const User = require('../models/User');

exports.createDoctor = async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload.userId && req.user) payload.userId = req.user._id;
    const doctor = await Doctor.create(payload);
    res.status(201).json({ success: true, data: doctor });
  } catch (err) { next(err); }
};

exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('userId', 'name email');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (err) { next(err); }
};

exports.updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: doctor });
  } catch (err) { next(err); }
};

// Get current doctor's profile
// Get all doctors for patient booking
exports.getAllDoctors = async (req, res, next) => {
  try {
    const { specialization, available, page = 1, limit = 10 } = req.query;
    
    const query = { isVerified: true, isActive: true };
    
    // Filter by specialization if provided
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }
    
    const doctors = await Doctor.find(query)
      .populate('userId', 'name email')
      .select('firstName lastName specialization profileImage experience rating consultationFee availability bio')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ rating: -1, experience: -1 });

    const total = await Doctor.countDocuments(query);

    // Format doctors for frontend
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor._id,
      name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialization: doctor.specialization,
      profileImage: doctor.profileImage,
      experience: doctor.experience || 5,
      rating: doctor.rating || 4.8,
      consultationFee: doctor.consultationFee || 50,
      availability: doctor.availability || 'Available',
      bio: doctor.bio || 'Experienced healthcare professional dedicated to providing quality care.',
      email: doctor.userId?.email
    }));

    res.json({
      success: true,
      data: formattedDoctors,
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

exports.getMyProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).populate('userId', 'name email');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    res.json({ success: true, data: doctor });
  } catch (err) { next(err); }
};

// Get doctor dashboard data
exports.getDashboardData = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's appointments
    const todayAppointments = await Appointment.find({
      doctor: doctor._id,
      scheduledAt: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled'] }
    }).populate({
      path: 'patient',
      populate: { path: 'userId', select: 'name email' }
    }).sort({ scheduledAt: 1 });

    // Get this month's stats
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlyAppointments = await Appointment.countDocuments({
      doctor: doctor._id,
      scheduledAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'completed'
    });

    // Get total patients treated
    const totalPatients = await Appointment.distinct('patient', {
      doctor: doctor._id,
      status: 'completed'
    });

    // Get average consultation time (mock data for now)
    const avgConsultTime = 18;

    // Get recent prescriptions count
    const recentPrescriptions = await Prescription.countDocuments({
      doctor: doctor._id,
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      success: true,
      data: {
        doctor,
        todayAppointments,
        stats: {
          todayPatients: todayAppointments.length,
          monthlyPatients: monthlyAppointments,
          totalPatients: totalPatients.length,
          avgConsultTime,
          recentPrescriptions,
          rating: 4.9 // Mock rating for now
        }
      }
    });
  } catch (err) { next(err); }
};

// Get doctor's patient queue
exports.getPatientQueue = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    // Get appointments from yesterday to next 3 days for better visibility
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctor: doctor._id,
      scheduledAt: { $gte: yesterday, $lte: threeDaysFromNow },
      status: { $in: ['scheduled', 'in_progress'] }
    })
    .populate({
      path: 'patient',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('aiAssessmentId')
    .sort({ scheduledAt: 1 });

    // Map appointments with AI assessment data
    const queueWithAI = appointments.map(appointment => {
      const appointmentObj = appointment.toObject();
      
      // If appointment has an AI assessment, use it; otherwise use mock data
      if (appointmentObj.aiAssessmentId) {
        return {
          ...appointmentObj,
          aiAssessment: {
            condition: appointmentObj.aiAssessmentId.condition || appointmentObj.reason || 'General Consultation',
            confidence: appointmentObj.aiAssessmentId.confidence || 85,
            severity: appointmentObj.aiAssessmentId.severity || 'Medium',
            symptoms: appointmentObj.aiAssessmentId.summary || appointmentObj.reason || 'Patient consultation'
          },
          waitTime: calculateWaitTime(appointment.scheduledAt)
        };
      } else {
        // Fallback to reason or mock data
        return {
          ...appointmentObj,
          aiAssessment: {
            condition: appointmentObj.reason || getRandomCondition(),
            confidence: Math.floor(Math.random() * 20) + 80,
            severity: getRandomSeverity(),
            symptoms: appointmentObj.reason || getRandomSymptoms()
          },
          waitTime: calculateWaitTime(appointment.scheduledAt)
        };
      }
    });

    res.json({ success: true, data: queueWithAI });
  } catch (err) { next(err); }
};

// Get doctor analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    // Get last 6 months data
    const monthlyData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await Appointment.countDocuments({
        doctor: doctor._id,
        scheduledAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'completed'
      });

      monthlyData.push({
        month: months[date.getMonth()],
        patients: count
      });
    }

    // Get condition statistics
    const totalAppointments = await Appointment.countDocuments({
      doctor: doctor._id,
      status: 'completed'
    });

    // Mock condition data (in real app, this would come from AI assessments)
    const topConditions = [
      { condition: 'Hypertension', count: Math.floor(totalAppointments * 0.25) },
      { condition: 'Common Cold', count: Math.floor(totalAppointments * 0.20) },
      { condition: 'Diabetes Management', count: Math.floor(totalAppointments * 0.18) },
      { condition: 'Respiratory Issues', count: Math.floor(totalAppointments * 0.15) }
    ];

    res.json({
      success: true,
      data: {
        monthlyData,
        topConditions,
        totalConsultations: totalAppointments,
        aiAgreementRate: 89,
        patientSatisfaction: 4.9,
        avgResponseTime: '< 2 min'
      }
    });
  } catch (err) { next(err); }
};

// Helper functions
function getRandomCondition() {
  const conditions = ['Common Cold', 'Hypertension Follow-up', 'Seasonal Allergies', 'Diabetes Check', 'Headache', 'Back Pain'];
  return conditions[Math.floor(Math.random() * conditions.length)];
}

function getRandomSeverity() {
  const severities = ['Low', 'Medium', 'High'];
  const weights = [0.6, 0.3, 0.1]; // 60% low, 30% medium, 10% high
  const random = Math.random();
  if (random < weights[0]) return severities[0];
  if (random < weights[0] + weights[1]) return severities[1];
  return severities[2];
}

function getRandomSymptoms() {
  const symptoms = [
    'Sore throat, mild fever, body aches',
    'Elevated blood pressure readings, headaches',
    'Sneezing, itchy eyes, nasal congestion',
    'Frequent urination, increased thirst',
    'Persistent headache, sensitivity to light',
    'Lower back pain, muscle stiffness'
  ];
  return symptoms[Math.floor(Math.random() * symptoms.length)];
}

function calculateWaitTime(scheduledAt) {
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diffMinutes = Math.max(0, Math.floor((scheduled - now) / (1000 * 60)));
  
  if (diffMinutes === 0) return 'Now';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
