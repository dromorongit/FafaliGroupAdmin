const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: false,
    default: ''
  },
  tourName: {
    type: String,
    required: true
  },
  tourPackage: {
    type: String,
    required: false,
    default: ''
  },
  departureDate: {
    type: Date,
    required: false
  },
  returnDate: {
    type: Date,
    required: false
  },
  numberOfTravelers: {
    type: Number,
    required: false,
    default: 1
  },
  totalAmount: {
    type: Number,
    required: false,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  specialRequests: {
    type: String,
    required: false,
    default: ''
  },
  source: {
    type: String,
    enum: ['website', 'admin', 'phone', 'walk-in'],
    default: 'website'
  },
  referenceNumber: {
    type: String,
    unique: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
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
    isVisibleToCustomer: {
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
  confirmedAt: Date,
  cancelledAt: Date
});

// Update the updatedAt field before saving
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
