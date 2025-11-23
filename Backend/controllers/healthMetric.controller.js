// controllers/healthMetric.controller.js
const HealthMetric = require('../models/HealthMetric');
const Patient = require('../models/Patient');

exports.createHealthMetric = async (req, res, next) => {
  try {
    let { patientId, healthScore, metrics, notes, recordedBy } = req.body;
    
    // If no patientId provided, get it from the authenticated user
    if (!patientId && req.user) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ userId: req.user._id });
      if (patient) {
        patientId = patient._id;
      }
    }
    
    const healthMetric = await HealthMetric.create({
      patient: patientId,
      healthScore,
      metrics,
      notes,
      recordedBy
    });

    // Add metric to patient's record and update current health score
    await Patient.findByIdAndUpdate(patientId, {
      $push: { healthMetrics: healthMetric._id },
      currentHealthScore: healthScore
    });

    const populatedMetric = await HealthMetric.findById(healthMetric._id).populate('patient', 'firstName lastName');
    
    res.status(201).json({ success: true, data: populatedMetric });
  } catch (err) {
    next(err);
  }
};

exports.getPatientHealthMetrics = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { limit = 10, page = 1, days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const metrics = await HealthMetric.find({ 
      patient: patientId,
      createdAt: { $gte: startDate }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('patient', 'firstName lastName');
    
    const total = await HealthMetric.countDocuments({ 
      patient: patientId,
      createdAt: { $gte: startDate }
    });
    
    res.json({
      success: true,
      data: metrics,
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

exports.getHealthTimeline = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { months = 6 } = req.query;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    const metrics = await HealthMetric.find({ 
      patient: patientId,
      createdAt: { $gte: startDate }
    })
      .sort({ createdAt: 1 })
      .select('healthScore createdAt');
    
    // Group by month for timeline
    const timeline = {};
    metrics.forEach(metric => {
      const monthKey = metric.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!timeline[monthKey]) {
        timeline[monthKey] = [];
      }
      timeline[monthKey].push(metric.healthScore);
    });
    
    // Calculate average for each month
    const timelineData = Object.keys(timeline).map(month => {
      const scores = timeline[month];
      const avgScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
      
      return {
        date: monthName,
        score: avgScore
      };
    });
    
    res.json({ success: true, data: timelineData });
  } catch (err) {
    next(err);
  }
};