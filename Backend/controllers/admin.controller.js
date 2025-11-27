// controllers/admin.controller.js
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { logAudit } = require('../utils/audit.js');

/**
 * GET /api/admin/users
 */
exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, q } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (q) {
      filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
    }
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    // audit: admin viewed user list (low-sensitivity, but useful)
    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'LIST_USERS',
      details: { query: { q, page, limit } },
      req,
    });

    res.json({ success: true, data: users, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
};

/**
 * POST /api/admin/promote/:userId
 */
exports.promoteToAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const previousRole = user.role;
    user.role = 'admin';
    await user.save();

    // audit
    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'PROMOTE_TO_ADMIN',
      targetType: 'User',
      targetId: user._id,
      details: { previousRole },
      req,
    });

    res.json({ success: true, message: 'User promoted to admin', data: { id: user._id, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

/**
 * GET /api/admin/doctors/pending
 */
exports.listPendingDoctors = async (req, res, next) => {
  try {
    const pending = await Doctor.find({ 
      verificationStatus: { $in: ['submitted', 'under_review'] }
    }).populate('userId', 'email name').sort({ verificationSubmittedAt: -1 }).lean();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'LIST_PENDING_DOCTORS',
      details: { count: pending.length },
      req,
    });

    res.json({ success: true, data: pending });
  } catch (err) { next(err); }
};

/**
 * POST /api/admin/doctors/verify/:doctorId
 * body: { action: 'verify' | 'reject', reason?: string }
 */
exports.verifyDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { action, reason } = req.body;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    if (action === 'verify') {
      doctor.verified = true;
      doctor.isVerified = true;
      doctor.verificationStatus = 'verified';
      doctor.verificationCompletedAt = new Date();
      await doctor.save();
      await require('../models/User').findByIdAndUpdate(doctor.userId, { isVerified: true });

      await logAudit({
        actorId: req.user._id,
        actorEmail: req.user.email,
        action: 'VERIFY_DOCTOR',
        targetType: 'Doctor',
        targetId: doctor._id,
        details: { message: 'Doctor verified' },
        req,
      });

      return res.json({ success: true, message: 'Doctor verified', data: doctor });
    } else {
      doctor.verified = false;
      doctor.isVerified = false;
      doctor.verificationStatus = 'rejected';
      doctor.rejectionReason = reason || 'Rejected by admin';
      doctor.verificationCompletedAt = new Date();
      await doctor.save();

      await logAudit({
        actorId: req.user._id,
        actorEmail: req.user.email,
        action: 'REJECT_DOCTOR',
        targetType: 'Doctor',
        targetId: doctor._id,
        details: { reason },
        req,
      });

      return res.json({ success: true, message: 'Doctor rejected', data: doctor });
    }
  } catch (err) { next(err); }
};

/**
 * DELETE /api/admin/users/:userId
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    // prevent self-delete
    if (req.user && req.user._id && req.user._id.toString() === userId) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete themselves' });
    }
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'DELETE_USER',
      targetType: 'User',
      targetId: userId,
      details: { deletedEmail: user.email },
      req,
    });

    // NOTE: consider cascading or marking related resources; for now we just remove the user doc.
    res.json({ success: true, message: 'User removed', data: { id: userId } });
  } catch (err) { next(err); }
};

/**
 * GET /api/admin/doctors/verified
 */
exports.listVerifiedDoctors = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [doctors, total] = await Promise.all([
      Doctor.find({ verified: true, isActive: true })
        .populate('userId', 'email name')
        .select('firstName lastName specialization profileImage experience rating verified isActive')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Doctor.countDocuments({ verified: true, isActive: true })
    ]);

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'LIST_VERIFIED_DOCTORS',
      details: { count: doctors.length },
      req,
    });

    res.json({ 
      success: true, 
      data: doctors,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) { next(err); }
};

/**
 * GET /api/admin/stats
 */
exports.getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, verifiedDoctors, pendingDoctors, totalAppointments] = await Promise.all([
      User.countDocuments(),
      Doctor.countDocuments({ verified: true }),
      Doctor.countDocuments({ verificationStatus: { $in: ['submitted', 'under_review'] } }),
      require('../models/Appointment').countDocuments()
    ]);

    // Get this month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [newUsersThisMonth, newDoctorsThisMonth, appointmentsThisMonth] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Doctor.countDocuments({ verified: true, verificationCompletedAt: { $gte: startOfMonth } }),
      require('../models/Appointment').countDocuments({ createdAt: { $gte: startOfMonth } })
    ]);

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'VIEW_ADMIN_STATS',
      details: { timestamp: new Date() },
      req,
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedDoctors,
        pendingDoctors,
        totalAppointments,
        newUsersThisMonth,
        newDoctorsThisMonth,
        appointmentsThisMonth
      }
    });
  } catch (err) { next(err); }
};

/**
 * GET /api/admin/doctors/:doctorId
 */
exports.getDoctorDetails = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId)
      .populate('userId', 'email name createdAt')
      .lean();
    
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    // Get appointment count for this doctor
    const appointmentCount = await require('../models/Appointment').countDocuments({ 
      doctor: doctorId,
      status: 'completed'
    });

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'VIEW_DOCTOR_DETAILS',
      targetType: 'Doctor',
      targetId: doctorId,
      req,
    });

    res.json({ 
      success: true, 
      data: { ...doctor, appointmentCount }
    });
  } catch (err) { next(err); }
};
