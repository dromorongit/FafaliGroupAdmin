/**
 * ApplicationTimeline Model
 * Tracks status changes and actions on applications
 */

const mongoose = require('mongoose');

const applicationTimelineSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'Created',
      'Submitted',
      'Status Changed',
      'Officer Assigned',
      'Note Added',
      'Document Uploaded',
      'Document Status Changed',
      'Withdrawn',
      'Reopened'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true
  },
  previousStatus: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Review', 'Queried', 'Approved', 'Rejected', 'Withdrawn', null],
    default: null
  },
  newStatus: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Review', 'Queried', 'Approved', 'Rejected', 'Withdrawn', null],
    default: null
  },
  comment: {
    type: String,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'application_timelines'
});

// Index for efficient timeline queries
applicationTimelineSchema.index({ applicationId: 1, createdAt: -1 });

module.exports = mongoose.model('ApplicationTimeline', applicationTimelineSchema);
