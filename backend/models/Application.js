const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicantName: {
    type: String,
    required: true
  },
  applicantEmail: {
    type: String,
    required: true
  },
  applicantPhone: {
    type: String,
    required: false, // Optional for public submissions
    default: ''
  },
  visaType: {
    type: String,
    required: true
  },
  travelPurpose: {
    type: String,
    required: true
  },
  travelDates: {
    from: Date,
    to: Date
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Review', 'Queried', 'Approved', 'Rejected'],
    default: 'Submitted'
  },
  source: {
    type: String,
    enum: ['website', 'admin'],
    default: 'website'
  },
  referenceNumber: {
    type: String,
    unique: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Not required for public website submissions
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  comments: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isVisibleToApplicant: {
      type: Boolean,
      default: true
    }
  }],
  internalNotes: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: Date,
  locked: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Application', applicationSchema);