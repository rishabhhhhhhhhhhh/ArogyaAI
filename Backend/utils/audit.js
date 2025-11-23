// utils/audit.js
const Audit = require('../models/Audit');

/**
 * logAudit
 * @param {Object} opts
 *    - actorId (ObjectId) required
 *    - actorEmail (string) optional
 *    - action (string) required
 *    - targetType (string) optional
 *    - targetId (ObjectId|string) optional
 *    - details (object) optional
 *    - req (express Request) optional - will extract IP and user agent
 */
async function logAudit(opts = {}) {
  try {
    const { actorId, actorEmail, action, targetType, targetId, details, req } = opts;
    if (!actorId || !action) return null;
    const entry = {
      actor: actorId,
      actorEmail: actorEmail,
      action,
      targetType,
      targetId,
      details: details || {},
      ip: req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : undefined,
      userAgent: req ? req.headers['user-agent'] : undefined,
      createdAt: new Date(),
    };
    return await Audit.create(entry);
  } catch (err) {
    // don't throw — auditing should not break main flow. Log for debugging.
    console.error('Audit logging failed:', err);
    return null;
  }
}

module.exports = {
  logAudit,
};