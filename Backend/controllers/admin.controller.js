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
    const pending = await Doctor.find({ verified: false }).populate('userId', 'email name').lean();

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
 * POST /api/admin/verify-doctor/:doctorId
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
      doctor.rejectionReason = reason || 'Rejected by admin';
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
