/**
 * AdminUser Model
 * Represents administrators in the Fafali Group Admin System
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Visa Officer', 'Finance Officer', 'Reviewer', 'Read-only'],
    default: 'Read-only'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
  }]
}, {
  timestamps: true,
  collection: 'admin_users'
});

adminUserSchema.index({ email: 1 });
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ isActive: 1 });

// Hash password before saving
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.passwordHash = await bcrypt.hash(this.passwordHash, rounds);
  next();
});

// Compare password method
adminUserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove sensitive fields from JSON output
adminUserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

// Static method to find active admin by email
adminUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
