// controllers/patient.controller.js
const Patient = require('../models/Patient');

exports.createPatient = async (req, res, next) => {
  try {
    const payload = req.body;
    // ensure userId present or set from auth
    if (!payload.userId && req.user) payload.userId = req.user._id;
    const p = await Patient.create(payload);
    res.status(201).json({ success: true, data: p });
  } catch (err) { next(err); }
};

exports.getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).populate('appointments prescriptions').lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
};

exports.getMyProfile = async (req, res, next) => {
  try {
    // find patient by userId
    const patient = await Patient.findOne({ userId: req.user._id }).populate('appointments prescriptions');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
};

exports.getDashboardData = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id })
      .populate({
        path: 'appointments',
        populate: { path: 'doctor', select: 'firstName lastName specialization profileImage' },
        match: { scheduledAt: { $gte: new Date() } },
        options: { sort: { scheduledAt: 1 }, limit: 5 }
      })
      .populate({
        path: 'prescriptions',
        populate: { path: 'doctor', select: 'firstName lastName' },
        options: { sort: { createdAt: -1 }, limit: 5 }
      })
      .populate({
        path: 'aiAssessments',
        options: { sort: { createdAt: -1 }, limit: 5 }
      });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    // Get health timeline data
    const HealthMetric = require('../models/HealthMetric');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const healthMetrics = await HealthMetric.find({ 
      patient: patient._id,
      createdAt: { $gte: sixMonthsAgo }
    }).sort({ createdAt: 1 }).select('healthScore createdAt');

    // Group by month for timeline
    const timeline = {};
    healthMetrics.forEach(metric => {
      const monthKey = metric.createdAt.toISOString().substring(0, 7);
      if (!timeline[monthKey]) {
        timeline[monthKey] = [];
      }
      timeline[monthKey].push(metric.healthScore);
    });

    const healthData = Object.keys(timeline).map(month => {
      const scores = timeline[month];
      const avgScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
      
      return { date: monthName, score: avgScore };
    });

    // If no health data, provide default timeline
    if (healthData.length === 0) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const baseScore = patient.currentHealthScore || 85;
      healthData.push(...months.map(month => ({
        date: month,
        score: baseScore + Math.floor(Math.random() * 10) - 5
      })));
    }

    // Calculate metrics
    const metrics = {
      aiAssessments: patient.aiAssessments?.length || 0,
      upcomingAppointments: patient.appointments?.length || 0,
      activePrescriptions: patient.prescriptions?.length || 0,
      healthScore: patient.currentHealthScore || 85
    };

    // Format appointments for frontend
    const appointments = patient.appointments?.map(apt => ({
      id: apt._id,
      doctor: `Dr. ${apt.doctor?.firstName} ${apt.doctor?.lastName}`,
      specialty: apt.doctor?.specialization || 'General Physician',
      date: new Date(apt.scheduledAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: new Date(apt.scheduledAt).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      type: apt.mode === 'video' ? 'Video Consultation' : apt.mode === 'audio' ? 'Audio Call' : 'In-Person',
      avatar: apt.doctor?.profileImage
    })) || [];

    // Format AI results for frontend
    const aiResults = patient.aiAssessments?.map(assessment => ({
      id: assessment._id,
      condition: assessment.condition,
      severity: assessment.severity,
      date: new Date(assessment.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      confidence: assessment.confidence
    })) || [];

    // Format prescriptions for frontend
    const prescriptions = patient.prescriptions?.map(prescription => ({
      id: prescription._id,
      medication: prescription.medications?.[0]?.name || 'Medication',
      doctor: `Dr. ${prescription.doctor?.firstName} ${prescription.doctor?.lastName}`,
      date: new Date(prescription.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      duration: prescription.medications?.[0]?.duration || 'As prescribed'
    })) || [];

    const dashboardData = {
      profile: {
        firstName: patient.firstName,
        lastName: patient.lastName || '',
        email: patient.email,
        phone: patient.phone
      },
      metrics,
      healthData,
      appointments,
      aiResults,
      prescriptions
    };

    res.json({ success: true, data: dashboardData });
  } catch (err) {
    next(err);
  }
};

exports.updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const patient = await Patient.findByIdAndUpdate(id, update, { new: true });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    // Find patient by userId from authenticated user
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    // Update patient profile with provided data
    const updateData = req.body;
    const updatedPatient = await Patient.findByIdAndUpdate(
      patient._id, 
      updateData, 
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updatedPatient });
  } catch (err) {
    next(err);
  }
};

exports.uploadImage = async (req, res, next) => {
  try {
    // upload.middleware places file info in req.file
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`; // serves from static route if you add it
    const patientId = req.params.id;
    const patient = await Patient.findByIdAndUpdate(patientId, { $push: { images: { url, label: req.body.label } } }, { new: true });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
};
