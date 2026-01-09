const Booking = require('../models/Booking');

const bookingController = {
  // Create new booking
  createBooking: async (req, res) => {
    try {
      const { 
        customerName, customerEmail, customerPhone, tourName, tourPackage,
        departureDate, returnDate, numberOfTravelers, totalAmount, 
        paymentStatus, specialRequests, source 
      } = req.body;
      
      const booking = new Booking({
        customerName,
        customerEmail,
        customerPhone,
        tourName,
        tourPackage,
        departureDate,
        returnDate,
        numberOfTravelers,
        totalAmount,
        paymentStatus,
        specialRequests,
        source: source || 'admin',
        referenceNumber: `BK-${Date.now().toString().slice(-6)}`,
        createdBy: req.user.id
      });
      
      await booking.save();
      res.status(201).json(booking);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get all bookings
  getAllBookings: async (req, res) => {
    try {
      let query = {};
      
      // Filter by status if provided
      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }
      
      // Filter by payment status if provided
      if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
        query.paymentStatus = req.query.paymentStatus;
      }
      
      // Search filter
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        query.$or = [
          { customerName: searchRegex },
          { customerEmail: searchRegex },
          { tourName: searchRegex }
        ];
      }
      
      const bookings = await Booking.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });
      
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get booking by ID
  getBookingById: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id)
        .populate('createdBy', 'firstName lastName email')
        .populate('comments.createdBy', 'firstName lastName email')
        .populate('internalNotes.createdBy', 'firstName lastName email');
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      res.json(booking);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Update booking
  updateBooking: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Update fields
      const updates = Object.keys(req.body);
      updates.forEach(update => {
        if (update !== 'createdBy') {
          booking[update] = req.body[update];
        }
      });
      
      booking.updatedAt = Date.now();
      
      await booking.save();
      res.json(booking);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Update booking status
  updateBookingStatus: async (req, res) => {
    try {
      const { status } = req.body;
      
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      booking.status = status;
      booking.updatedAt = Date.now();
      
      // Set confirmedAt if status is Confirmed
      if (status === 'Confirmed' && !booking.confirmedAt) {
        booking.confirmedAt = Date.now();
      }
      
      // Set cancelledAt if status is Cancelled
      if (status === 'Cancelled' && !booking.cancelledAt) {
        booking.cancelledAt = Date.now();
      }
      
      await booking.save();
      res.json(booking);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Add comment to booking
  addComment: async (req, res) => {
    try {
      const { text, isVisibleToCustomer } = req.body;
      
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      booking.comments.push({
        text,
        createdBy: req.user.id,
        isVisibleToCustomer: isVisibleToCustomer !== undefined ? isVisibleToCustomer : true
      });
      
      await booking.save();
      res.json(booking);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Add internal note to booking
  addInternalNote: async (req, res) => {
    try {
      const { text } = req.body;
      
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      booking.internalNotes.push({
        text,
        createdBy: req.user.id
      });
      
      await booking.save();
      res.json(booking);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get booking statistics for dashboard
  getBookingStats: async (req, res) => {
    try {
      const stats = {
        total: await Booking.countDocuments(),
        byStatus: await Booking.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        byPaymentStatus: await Booking.aggregate([
          { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
        ]),
        totalRevenue: await Booking.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      };
      
      // Recent bookings
      const recentBookings = await Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('createdBy', 'firstName lastName email');
      
      res.json({ stats, recentBookings });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Delete single booking
  deleteBooking: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      await Booking.findByIdAndDelete(req.params.id);
      res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Bulk delete bookings
  bulkDeleteBookings: async (req, res) => {
    try {
      const { bookingIds } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: 'No bookings selected for deletion' });
      }
      
      const bookingsToDelete = await Booking.find({ _id: { $in: bookingIds } });
      
      if (bookingsToDelete.length === 0) {
        return res.status(404).json({ message: 'No bookings found for deletion' });
      }
      
      await Booking.deleteMany({ _id: { $in: bookingIds } });
      
      res.json({ 
        message: `${bookingsToDelete.length} booking(s) deleted successfully`,
        deletedCount: bookingsToDelete.length
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = bookingController;
