import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { FaFileAlt, FaCheckCircle, FaTimesCircle, FaClock, FaQuestionCircle, FaExclamationCircle, FaEdit, FaSave, FaLock, FaUnlock, FaComment, FaStickyNote, FaPaperclip } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ApplicationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [newComment, setNewComment] = useState('');
  const [newNote, setNewNote] = useState('');
  const [commentVisible, setCommentVisible] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      const response = await api.get(`/applications/${id}`);
      setApplication(response.data);
      setEditData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch application details');
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/applications/${id}`, editData);
      toast.success('Application updated successfully');
      setEditing(false);
      fetchApplication();
    } catch (err) {
      toast.error('Failed to update application');
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post(`/applications/${id}/submit`);
      toast.success('Application submitted successfully');
      fetchApplication();
    } catch (err) {
      toast.error('Failed to submit application');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await api.post(`/applications/${id}/comments`, {
        text: newComment,
        isVisibleToApplicant: commentVisible
      });
      toast.success('Comment added successfully');
      setNewComment('');
      setCommentVisible(true);
      fetchApplication();
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await api.post(`/applications/${id}/notes`, {
        text: newNote
      });
      toast.success('Internal note added successfully');
      setNewNote('');
      fetchApplication();
    } catch (err) {
      toast.error('Failed to add internal note');
    }
  };

  const statusIcons = {
    'Draft': <FaClock className="text-gray-400" />,
    'Submitted': <FaFileAlt className="text-blue-500" />,
    'Under Review': <FaClock className="text-yellow-500" />,
    'Queried': <FaQuestionCircle className="text-purple-500" />,
    'Approved': <FaCheckCircle className="text-green-500" />,
    'Rejected': <FaTimesCircle className="text-red-500" />
  };

  const statusColors = {
    'Draft': 'bg-gray-100 text-gray-800',
    'Submitted': 'bg-blue-100 text-blue-800',
    'Under Review': 'bg-yellow-100 text-yellow-800',
    'Queried': 'bg-purple-100 text-purple-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800'
  };

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
            <FaExclamationCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => navigate('/applications')}
              className="mt-2 text-sm text-red-700 hover:text-red-900"
            >
              Back to applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <FaExclamationCircle className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-500">Application not found</p>
        <button
          onClick={() => navigate('/applications')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Back to applications
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            Application Details
            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[application.status]}`}>
              {statusIcons[application.status]}
              <span className="ml-1">{application.status}</span>
            </span>
          </h1>
          <p className="text-gray-600 mt-1">
            {application.locked ? 'Locked' : 'Editable'} • Created {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          {!application.locked && (
            <button
              onClick={() => setEditing(!editing)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {editing ? <><FaSave className="mr-2" /> Save</> : <><FaEdit className="mr-2" /> Edit</>}
            </button>
          )}
          
          {!application.locked && application.status === 'Draft' && (
            <button
              onClick={handleSubmit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FaLock className="mr-2" />
              Submit Application
            </button>
          )}
          
          <Link
            to={`/documents/${application._id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <FaPaperclip className="mr-2" />
            Manage Documents
          </Link>
        </div>
      </div>

      {/* Application Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Applicant Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Applicant Name</label>
            {editing ? (
              <input
                type="text"
                value={editData.applicantName}
                onChange={(e) => setEditData({...editData, applicantName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="text-gray-900">{application.applicantName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            {editing ? (
              <input
                type="email"
                value={editData.applicantEmail}
                onChange={(e) => setEditData({...editData, applicantEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="text-gray-900">{application.applicantEmail}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            {editing ? (
              <input
                type="tel"
                value={editData.applicantPhone}
                onChange={(e) => setEditData({...editData, applicantPhone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="text-gray-900">{application.applicantPhone}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
            {editing ? (
              <input
                type="text"
                value={editData.visaType}
                onChange={(e) => setEditData({...editData, visaType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <p className="text-gray-900">{application.visaType}</p>
            )}
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Travel Purpose</label>
            {editing ? (
              <textarea
                value={editData.travelPurpose}
                onChange={(e) => setEditData({...editData, travelPurpose: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            ) : (
              <p className="text-gray-900">{application.travelPurpose}</p>
            )}
          </div>
        </div>
        
        {editing && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editData.status}
              onChange={(e) => setEditData({...editData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Queried">Queried</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Visible to applicant
          </span>
        </div>
        
        {application.comments.length === 0 ? (
          <p className="text-gray-500">No comments yet</p>
        ) : (
          <div className="space-y-4 mb-6">
            {application.comments.map((comment, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium mr-3">
                      {comment.createdBy?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{comment.createdBy?.firstName} {comment.createdBy?.lastName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${comment.isVisibleToApplicant ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {comment.isVisibleToApplicant ? 'Visible' : 'Internal'}
                  </span>
                </div>
                <p className="mt-2 text-gray-700">{comment.text}</p>
              </div>
            ))}
          </div>
        )}
        
        {!application.locked && (
          <div className="mt-6">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium mr-3 flex-shrink-0">
                {application.createdBy?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
                <div className="mt-2 flex items-center">
                  <input
                    id="comment-visible"
                    type="checkbox"
                    checked={commentVisible}
                    onChange={(e) => setCommentVisible(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="comment-visible" className="ml-2 block text-sm text-gray-900">
                    Visible to applicant
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${newComment.trim() ? 'bg-primary-600 hover:bg-primary-700' : 'bg-primary-300 cursor-not-allowed'}`}
              >
                <FaComment className="mr-2" />
                Add Comment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Internal Notes Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Internal Notes</h2>
          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Hidden from applicant
          </span>
        </div>
        
        {application.internalNotes.length === 0 ? (
          <p className="text-gray-500">No internal notes yet</p>
        ) : (
          <div className="space-y-4 mb-6">
            {application.internalNotes.map((note, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium mr-3">
                    {note.createdBy?.firstName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{note.createdBy?.firstName} {note.createdBy?.lastName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700">{note.text}</p>
              </div>
            ))}
          </div>
        )}
        
        {!application.locked && (
          <div className="mt-6">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium mr-3 flex-shrink-0">
                {application.createdBy?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${newNote.trim() ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                <FaStickyNote className="mr-2" />
                Add Internal Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationDetailPage;