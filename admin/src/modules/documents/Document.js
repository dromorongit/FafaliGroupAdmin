/**
 * Document Model
 * Manages documents uploaded for applications
 */

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: [
      'Passport',
      'ID Card',
      'Visa Application Form',
      'Photo',
      'Flight Itinerary',
      'Hotel Booking Confirmation',
      'Travel Insurance',
      'Bank Statement',
      'Employment Letter',
      'Invitation Letter',
      'Other'
    ]
  },
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected', 'Re-upload Required'],
    default: 'Pending'
  },
  expiryDate: {
    type: Date,
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  collection: 'documents'
});

// Indexes
documentSchema.index({ applicationId: 1, status: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Document', documentSchema);
