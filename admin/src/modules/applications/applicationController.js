/**
 * Application Controller
 * Handles CRUD operations for visa, travel, and event applications
 */

const Application = require('./Application');
const ApplicationTimeline = require('./ApplicationTimeline');
const auditService = require('../../services/auditService');
const { requireRole, ROLE_HIERARCHY } = require('../../middleware/rbac');

// Valid statuses and transitions
const VALID_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Queried', 'Approved', 'Rejected', 'Withdrawn'];

// Status transitions that require approval
const RESTRICTED_TRANSITIONS = {
  'Under Review': ['Queried', 'Approved', 'Rejected'],
  'Queried': ['Under Review', 'Withdrawn'],
  'Draft': ['Submitted', 'Withdrawn']
};

/**
 * Create a new application
 */
const createApplication = async (req, res) => {
  try {
    const { applicationType, applicantProfile, additionalData } = req.body;

    // Create application
    const application = new Application({
      applicationType,
      applicantProfile,
      additionalData: additionalData || {},
      status: 'Draft'
    });

    await application.save();

    // Log timeline entry
    await ApplicationTimeline.create({
      applicationId: application._id,
      action: 'Created',
      performedBy: req.user._id,
      comment: 'Application created'
    });

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'APPLICATION_CREATED',
      req,
      metadata: {
        applicationId: application._id,
        applicationType: application.applicationType,
        applicantEmail: applicantProfile.email
      }
    });

    return res.status(201).json({
      success: true,
      data: application,
      message: 'Application created successfully'
    });
  } catch (error) {
    console.error('Create application error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create application'
    });
  }
};

/**
 * Get all applications with filtering and pagination
 */
const getApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      applicationType,
      assignedOfficer,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Role-based filtering
    const userRole = req.user.role;
    const isSuperAdmin = userRole === 'Super Admin';
    const isReadOnly = userRole === 'Read-only';
    const isReviewer = userRole === 'Reviewer';

    // Non-Super Admin users can only see assigned applications or all (for visibility)
    // For now, we show all but filter based on role in real scenarios
    if (!isSuperAdmin) {
      // Visa Officers see their assigned applications
      if (userRole === 'Visa Officer') {
        // Can see assigned or unassigned
        query.$or = [
          { assignedOfficer: req.user._id },
          { assignedOfficer: { $exists: false } }
        ];
      }
    }

    // Apply filters
    if (status) query.status = status;
    if (applicationType) query.applicationType = applicationType;
    if (assignedOfficer) query.assignedOfficer = assignedOfficer;

    // Search in applicant name or email
    if (search) {
      query.$or = [
        { 'applicantProfile.firstName': { $regex: search, $options: 'i' } },
        { 'applicantProfile.lastName': { $regex: search, $options: 'i' } },
        { 'applicantProfile.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [applications, total] = await Promise.all([
      Application.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedOfficer', 'name email role'),
      Application.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch applications'
    });
  }
};

/**
 * Get single application by ID
 */
const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('assignedOfficer', 'name email role');

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Get timeline
    const timeline = await ApplicationTimeline.find({ applicationId: application._id })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name email');

    // Get documents
    const Document = require('../documents/Document');
    const documents = await Document.find({ applicationId: application._id })
      .populate('uploadedBy', 'name')
      .populate('verifiedBy', 'name');

    return res.json({
      success: true,
      data: {
        application,
        timeline,
        documents
      }
    });
  } catch (error) {
    console.error('Get application error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch application'
    });
  }
};

/**
 * Update application status
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, comment } = req.body;
    const applicationId = req.params.id;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Prevent modification of locked applications
    if (application.locked && !['Withdrawn'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify locked application'
      });
    }

    const previousStatus = application.status;

    // Role-based status update restrictions
    const userRole = req.user.role;
    const isSuperAdmin = userRole === 'Super Admin';
    const isVisaOfficer = userRole === 'Visa Officer';

    // Reviewers cannot approve or reject
    if (userRole === 'Reviewer' && ['Approved', 'Rejected'].includes(status)) {
      return res.status(403).json({
        success: false,
        error: 'Reviewers cannot approve or reject applications'
      });
    }

    // Update status
    application.status = status;

    // Set submission date if submitting
    if (status === 'Submitted' && !application.submissionDate) {
      application.submissionDate = new Date();
      application.locked = true;
    }

    await application.save();

    // Log timeline
    await ApplicationTimeline.create({
      applicationId: application._id,
      action: 'Status Changed',
      performedBy: req.user._id,
      previousStatus,
      newStatus: status,
      comment: comment || `Status changed from ${previousStatus} to ${status}`
    });

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'APPLICATION_STATUS_CHANGED',
      req,
      metadata: {
        applicationId: application._id,
        previousStatus,
        newStatus: status
      }
    });

    return res.json({
      success: true,
      data: application,
      message: 'Application status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status'
    });
  }
};

/**
 * Assign application to an officer
 */
const assignOfficer = async (req, res) => {
  try {
    const { officerId } = req.body;
    const applicationId = req.params.id;

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const AdminUser = require('../../models/AdminUser');
    const officer = await AdminUser.findById(officerId);

    if (!officer) {
      return res.status(404).json({
        success: false,
        error: 'Officer not found'
      });
    }

    const previousOfficer = application.assignedOfficer;
    application.assignedOfficer = officerId;
    await application.save();

    // Log timeline
    await ApplicationTimeline.create({
      applicationId: application._id,
      action: 'Officer Assigned',
      performedBy: req.user._id,
      comment: `Assigned to ${officer.name}`
    });

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'APPLICATION_OFFICER_ASSIGNED',
      req,
      metadata: {
        applicationId: application._id,
        officerId,
        officerName: officer.name
      }
    });

    return res.json({
      success: true,
      data: application,
      message: 'Officer assigned successfully'
    });
  } catch (error) {
    console.error('Assign officer error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign officer'
    });
  }
};

/**
 * Add internal note to application
 */
const addNote = async (req, res) => {
  try {
    const { note } = req.body;
    const applicationId = req.params.id;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    application.internalNotes.push({
      note: note.trim(),
      createdBy: req.user._id
    });

    await application.save();

    // Log timeline
    await ApplicationTimeline.create({
      applicationId: application._id,
      action: 'Note Added',
      performedBy: req.user._id,
      comment: note.substring(0, 200)
    });

    // Audit log
    await auditService.logEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'APPLICATION_NOTE_ADDED',
      req,
      metadata: {
        applicationId: application._id,
        noteLength: note.length
      }
    });

    // Return updated application with populated notes
    const updatedApplication = await Application.findById(applicationId)
      .populate('internalNotes.createdBy', 'name email');

    return res.json({
      success: true,
      data: updatedApplication,
      message: 'Note added successfully'
    });
  } catch (error) {
    console.error('Add note error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to add note'
    });
  }
};

/**
 * Get application statistics
 */
const getApplicationStats = async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Application.aggregate([
      {
        $group: {
          _id: '$applicationType',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentActivity = await ApplicationTimeline.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return res.json({
      success: true,
      data: {
        byStatus: stats,
        byType: typeStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics'
    });
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  assignOfficer,
  addNote,
  getApplicationStats,
  VALID_STATUSES
};
