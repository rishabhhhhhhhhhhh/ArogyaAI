// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    name: { type: String },
    provider: { type: String }, // 'google', 'facebook', etc.
    providerId: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// hash password pre-save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// compare password
UserSchema.methods.matchPassword = async function (candidate) {
  return await bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
