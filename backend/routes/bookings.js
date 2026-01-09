const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private
router.post('/', auth(), bookingController.createBooking);

// @route   GET /api/bookings
// @desc    Get all bookings
// @access  Private
router.get('/', auth(), bookingController.getAllBookings);

// @route   GET /api/bookings/stats
// @desc    Get booking statistics for dashboard
// @access  Private
router.get('/stats', auth(), bookingController.getBookingStats);

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', auth(), bookingController.getBookingById);

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Private
router.put('/:id', auth(), bookingController.updateBooking);

// @route   PATCH /api/bookings/:id/status
// @desc    Update booking status
// @access  Private
router.patch('/:id/status', auth(), bookingController.updateBookingStatus);

// @route   POST /api/bookings/:id/comments
// @desc    Add comment to booking
// @access  Private
router.post('/:id/comments', auth(), bookingController.addComment);

// @route   POST /api/bookings/:id/notes
// @desc    Add internal note to booking
// @access  Private
router.post('/:id/notes', auth(), bookingController.addInternalNote);

// @route   DELETE /api/bookings/:id
// @desc    Delete single booking
// @access  Private
router.delete('/:id', auth(), bookingController.deleteBooking);

// @route   DELETE /api/bookings/bulk/delete
// @desc    Bulk delete bookings
// @access  Private
router.delete('/bulk/delete', auth(), bookingController.bulkDeleteBookings);

module.exports = router;
