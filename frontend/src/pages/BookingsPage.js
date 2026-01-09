import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaPlus, FaSearch, FaCalendar, FaCheck, FaTimes, FaClock, FaTrash, FaComment, FaEye, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newBooking, setNewBooking] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    tourName: '',
    tourPackage: '',
    departureDate: '',
    returnDate: '',
    numberOfTravelers: 1,
    totalAmount: 0,
    paymentStatus: 'pending',
    specialRequests: ''
  });
  const [newComment, setNewComment] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, paymentFilter]);

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/bookings?${params.toString()}`);
      setBookings(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch bookings');
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bookings', newBooking);
      toast.success('Booking created successfully');
      setShowCreateModal(false);
      setNewBooking({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        tourName: '',
        tourPackage: '',
        departureDate: '',
        returnDate: '',
        numberOfTravelers: 1,
        totalAmount: 0,
        paymentStatus: 'pending',
        specialRequests: ''
      });
      fetchBookings();
    } catch (err) {
      toast.error('Failed to create booking');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      toast.success('Booking status updated successfully');
      fetchBookings();
      if (selectedBooking && selectedBooking._id === id) {
        setSelectedBooking({ ...selectedBooking, status });
      }
    } catch (err) {
      toast.error('Failed to update booking status');
    }
  };

  const handleAddComment = async (id) => {
    if (!newComment.trim()) return;
    
    try {
      await api.post(`/bookings/${id}/comments`, { text: newComment, isVisibleToCustomer: true });
      toast.success('Comment added successfully');
      setNewComment('');
      fetchBookingDetail(id);
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleAddInternalNote = async (id) => {
    if (!newNote.trim()) return;
    
    try {
      await api.post(`/bookings/${id}/notes`, { text: newNote });
      toast.success('Internal note added successfully');
      setNewNote('');
      fetchBookingDetail(id);
    } catch (err) {
      toast.error('Failed to add internal note');
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      await api.delete(`/bookings/${id}`);
      toast.success('Booking deleted successfully');
      setShowDetailModal(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete booking');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedApplications.length === 0) {
      toast.error('No bookings selected');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedApplications.length} booking(s)?`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      await api.delete('/bookings/bulk/delete', {
        data: { bookingIds: selectedApplications }
      });
      toast.success(`${selectedApplications.length} booking(s) deleted successfully`);
      setSelectedApplications([]);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete bookings');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedApplications.length === filteredBookings.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(filteredBookings.map(booking => booking._id));
    }
  };

  const toggleSelectBooking = (id) => {
    if (selectedApplications.includes(id)) {
      setSelectedApplications(selectedApplications.filter(bookingId => bookingId !== id));
    } else {
      setSelectedApplications([...selectedApplications, id]);
    }
  };

  const fetchBookingDetail = async (id) => {
    try {
      const response = await api.get(`/bookings/${id}`);
      setSelectedBooking(response.data);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Failed to fetch booking details');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.tourName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Confirmed': 'bg-green-100 text-green-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-gray-100 text-gray-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  const paymentColors = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'partial': 'bg-orange-100 text-orange-800',
    'paid': 'bg-green-100 text-green-800',
    'refunded': 'bg-gray-100 text-gray-800'
  };

  const statusOptions = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <FaTimes className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Tour Bookings</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {selectedApplications.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <FaTrash className="mr-2" />
              Delete Selected ({selectedApplications.length})
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <FaPlus className="mr-2" />
            Create Booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Bookings
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Search by name, email, or tour"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Filter
            </label>
            <select
              id="paymentStatus"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <FaCalendar className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No bookings found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FaPlus className="mr-2" />
              Create First Booking
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedApplications.length === filteredBookings.length && filteredBookings.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departure
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Travelers
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedApplications.includes(booking._id)}
                          onChange={() => toggleSelectBooking(booking._id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                      <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.tourName}</div>
                      {booking.tourPackage && (
                        <div className="text-xs text-gray-500">{booking.tourPackage}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.departureDate ? new Date(booking.departureDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.numberOfTravelers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentColors[booking.paymentStatus]}`}>
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => fetchBookingDetail(booking._id)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking._id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete Booking"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Booking Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FaCalendar className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Create New Booking
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Fill in the booking details to create a new tour booking.
                      </p>
                    </div>
                  </div>
                </div>

                <form className="mt-5 space-y-4" onSubmit={handleCreateBooking}>
                  <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                        Customer Name
                      </label>
                      <div className="mt-1">
                        <input
                          id="customerName"
                          name="customerName"
                          type="text"
                          required
                          value={newBooking.customerName}
                          onChange={(e) => setNewBooking({...newBooking, customerName: e.target.value})}
                          className="block w-full shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1">
                        <input
                          id="customerEmail"
                          name="customerEmail"
                          type="email"
                          required
                          value={newBooking.customerEmail}
                          onChange={(e) => setNewBooking({...newBooking, customerEmail: e.target.value})}
                          className="block w-full shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <div className="mt-1">
                        <input
                          id="customerPhone"
                          name="customerPhone"
                          type="tel"
                          value={newBooking.customerPhone}
                          onChange={(e) => setNewBooking({...newBooking, customerPhone: e.target.value})}
                          className="block w-full shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="tourName" className="block text-sm font-medium text-gray-700">
                        Tour Name
                      </label>
                      <div className="mt-1">
                        <input
                          id="tourName"
                          name="tourName"
                          type="text"
                          required
                          value={newBooking.tourName}
                          onChange={(e) => setNewBooking({...newBooking, tourName: e.target.value})}
                          className="block w-full shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700">
                        Departure Date
                      </label>
                      <div className="mt-1">
                        <input
                          id="departureDate"
                          name="departureDate"
                          type="date"
                          value={newBooking.departureDate}
                          onChange={(e) => setNewBooking({...newBooking, departureDate: e.target.value})}
                          className="block w-full shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="numberOfTravelers" className="block text-sm font-medium text-gray-700">
                        Travelers
                      </label>
                      <div className="mt-1">
                        <input
                          id="numberOfTravelers"
                          name="numberOfTravelers"
                          type="number"
                          min="1"
                          value={newBooking.numberOfTravelers}
                          onChange={(e) => setNewBooking({...newBooking, numberOfTravelers: parseInt(e.target.value)})}
                          className="block w-full shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500 border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCreateBooking}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Booking
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start justify-between">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Booking Details
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Created on {new Date(selectedBooking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedBooking.status]}`}>
                      {selectedBooking.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentColors[selectedBooking.paymentStatus]}`}>
                      {selectedBooking.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                    <p className="text-sm text-gray-900">{selectedBooking.customerName}</p>
                    <p className="text-sm text-gray-500">{selectedBooking.customerEmail}</p>
                    {selectedBooking.customerPhone && (
                      <p className="text-sm text-gray-500">{selectedBooking.customerPhone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tour</label>
                    <p className="text-sm text-gray-900">{selectedBooking.tourName}</p>
                    {selectedBooking.tourPackage && (
                      <p className="text-sm text-gray-500">{selectedBooking.tourPackage}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Travel Dates</label>
                    <p className="text-sm text-gray-900">
                      {selectedBooking.departureDate ? new Date(selectedBooking.departureDate).toLocaleDateString() : '-'}
                      {selectedBooking.returnDate && ` - ${new Date(selectedBooking.returnDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Travelers & Amount</label>
                    <p className="text-sm text-gray-900">
                      {selectedBooking.numberOfTravelers} traveler(s)
                      {selectedBooking.totalAmount > 0 && ` - $${selectedBooking.totalAmount}`}
                    </p>
                  </div>
                </div>

                {/* Status Update */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map(status => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedBooking._id, status)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          selectedBooking.status === status
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                  {selectedBooking.comments && selectedBooking.comments.length > 0 ? (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      {selectedBooking.comments.map((comment, index) => (
                        <div key={index} className="bg-gray-50 rounded-md p-2">
                          <p className="text-sm text-gray-900">{comment.text}</p>
                          <p className="text-xs text-gray-500">
                            {comment.createdBy?.firstName} {comment.createdBy?.lastName} - {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">No comments yet</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={() => handleAddComment(selectedBooking._id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      <FaComment className="mr-1" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
                  {selectedBooking.internalNotes && selectedBooking.internalNotes.length > 0 ? (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      {selectedBooking.internalNotes.map((note, index) => (
                        <div key={index} className="bg-yellow-50 rounded-md p-2">
                          <p className="text-sm text-gray-900">{note.text}</p>
                          <p className="text-xs text-gray-500">
                            {note.createdBy?.firstName} {note.createdBy?.lastName} - {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">No internal notes yet</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add internal note..."
                      className="flex-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={() => handleAddInternalNote(selectedBooking._id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                    >
                      <FaEdit className="mr-1" />
                      Add Note
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleDeleteBooking(selectedBooking._id)}
                  disabled={isDeleting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  <FaTrash className="mr-2" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedBooking(null);
                    setNewComment('');
                    setNewNote('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
