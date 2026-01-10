const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  documentType: {
    type: String,
    enum: ['passport', 'bank_statement', 'invitation_letter', 'other'],
    required: true
  },
  filePath: {
    type: String,
    required: function() { return !this.cloudinaryUrl; } // Required if no cloudinaryUrl
  },
  originalFileName: {
    type: String,
    required: function() { return !this.cloudinaryUrl; } // Required if no cloudinaryUrl
  },
  cloudinaryUrl: {
    type: String,
    required: function() { return !this.filePath; } // Required if no filePath
  },
  cloudinaryPublicId: {
    type: String
  },
  source: {
    type: String,
    enum: ['upload', 'cloudinary', 'external'],
    default: 'upload'
  },
  status: {
    type: String,
    enum: ['Uploaded', 'Verified', 'Rejected', 'Re-upload Required'],
    default: 'Uploaded'
  },
  rejectionReason: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Document', documentSchema);