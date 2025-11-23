// controllers/prescription.controller.js
const Prescription = require('../models/Prescription');

exports.createPrescription = async (req, res, next) => {
  try {
    const payload = req.body;
    const presc = await Prescription.create(payload);
    res.status(201).json({ success: true, data: presc });
  } catch (err) { next(err); }
};

exports.getPrescription = async (req, res, next) => {
  try {
    const presc = await Prescription.findById(req.params.id).populate('patient doctor appointment');
    if (!presc) return res.status(404).json({ success: false, message: 'Prescription not found' });
    res.json({ success: true, data: presc });
  } catch (err) { next(err); }
};

exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const Patient = require('../models/Patient');
    const patient = await Patient.findOne({ userId: req.user._id });
    
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const { page = 1, limit = 10, recent } = req.query;
    const query = { patient: patient._id };
    
    // Filter recent prescriptions (last 30 days)
    if (recent === 'true') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { $gte: thirtyDaysAgo };
    }

    const prescriptions = await Prescription.find(query)
      .populate('doctor', 'firstName lastName specialization')
      .populate('appointment', 'scheduledAt reason')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Prescription.countDocuments(query);

    // Format prescriptions for frontend
    const formattedPrescriptions = prescriptions.map(presc => ({
      id: presc._id,
      doctor: {
        name: `Dr. ${presc.doctor?.firstName} ${presc.doctor?.lastName}`,
        specialty: presc.doctor?.specialization || 'General Physician'
      },
      medications: presc.medications,
      notes: presc.notes,
      issuedAt: presc.issuedAt,
      createdAt: presc.createdAt,
      appointment: presc.appointment ? {
        date: presc.appointment.scheduledAt,
        reason: presc.appointment.reason
      } : null,
      files: presc.files || []
    }));

    res.json({
      success: true,
      data: formattedPrescriptions,
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
