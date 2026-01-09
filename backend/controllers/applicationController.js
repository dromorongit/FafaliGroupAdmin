const Application = require('../models/Application');
const Document = require('../models/Document');

const applicationController = {
  // Create new application
  createApplication: async (req, res) => {
    try {
      const { applicantName, applicantEmail, applicantPhone, visaType, travelPurpose, travelDates } = req.body;
      
      const application = new Application({
        applicantName,
        applicantEmail,
        applicantPhone,
        visaType,
        travelPurpose,
        travelDates,
        createdBy: req.user.id
      });
      
      await application.save();
      res.status(201).json(application);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get all applications
  getAllApplications: async (req, res) => {
    try {
      let query = {};
      
      // Visa officers can only see their assigned applications
      if (req.user.role === 'visa_officer') {
        query = { assignedTo: req.user.id };
      }
      
      const applications = await Application.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .sort({ createdAt: -1 });
      
      res.json(applications);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get application by ID
  getApplicationById: async (req, res) => {
    try {
      const application = await Application.findById(req.params.id)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .populate('comments.createdBy', 'firstName lastName email')
        .populate('internalNotes.createdBy', 'firstName lastName email');
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access to this application
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(application);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Update application
  updateApplication: async (req, res) => {
    try {
      const application = await Application.findById(req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access to this application
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Prevent editing if application is locked
      if (application.locked && req.body.status !== application.status) {
        return res.status(400).json({ message: 'Cannot edit locked application' });
      }
      
      // Update fields
      const updates = Object.keys(req.body);
      updates.forEach(update => {
        if (update !== 'createdBy' && update !== 'assignedTo') {
          application[update] = req.body[update];
        }
      });
      
      application.updatedAt = Date.now();
      
      await application.save();
      res.json(application);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Submit application (lock it)
  submitApplication: async (req, res) => {
    try {
      const application = await Application.findById(req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access to this application
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      application.status = 'Submitted';
      application.locked = true;
      application.submittedAt = Date.now();
      
      await application.save();
      res.json(application);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Add comment to application
  addComment: async (req, res) => {
    try {
      const { text, isVisibleToApplicant } = req.body;
      
      const application = await Application.findById(req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access to this application
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      application.comments.push({
        text,
        createdBy: req.user.id,
        isVisibleToApplicant: isVisibleToApplicant !== undefined ? isVisibleToApplicant : true
      });
      
      await application.save();
      res.json(application);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Add internal note to application
  addInternalNote: async (req, res) => {
    try {
      const { text } = req.body;
      
      const application = await Application.findById(req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access to this application
      if (req.user.role === 'visa_officer' && application.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      application.internalNotes.push({
        text,
        createdBy: req.user.id
      });
      
      await application.save();
      res.json(application);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Get application statistics for dashboard
  getApplicationStats: async (req, res) => {
    try {
      let query = {};
      
      // Visa officers can only see their assigned applications
      if (req.user.role === 'visa_officer') {
        query = { assignedTo: req.user.id };
      }
      
      const stats = {
        total: await Application.countDocuments(query),
        byStatus: await Application.aggregate([
          { $match: query },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        missingDocuments: await Application.countDocuments({
          ...query,
          status: { $in: ['Draft', 'Submitted', 'Under Review'] }
        })
      };
      
      // Recent applications
      const recentApplications = await Application.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email');
      
      res.json({ stats, recentApplications });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Delete single application
  deleteApplication: async (req, res) => {
    try {
      const application = await Application.findById(req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if user has access (admin or createdBy)
      if (req.user.role !== 'admin' && application.createdBy?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Delete associated documents
      await Document.deleteMany({ applicationId: req.params.id });
      
      await Application.findByIdAndDelete(req.params.id);
      res.json({ message: 'Application deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  
  // Bulk delete applications
  bulkDeleteApplications: async (req, res) => {
    try {
      const { applicationIds } = req.body;
      
      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({ message: 'No applications selected for deletion' });
      }
      
      // For non-admin users, only delete their own applications
      let query = { _id: { $in: applicationIds } };
      if (req.user.role !== 'admin') {
        query.createdBy = req.user.id;
      }
      
      // Get applications to delete
      const applicationsToDelete = await Application.find(query);
      
      if (applicationsToDelete.length === 0) {
        return res.status(404).json({ message: 'No applications found for deletion' });
      }
      
      // Delete associated documents
      await Document.deleteMany({ applicationId: { $in: applicationIds } });
      
      // Delete applications
      await Application.deleteMany({ _id: { $in: applicationIds } });
      
      res.json({ 
        message: `${applicationsToDelete.length} application(s) deleted successfully`,
        deletedCount: applicationsToDelete.length
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = applicationController;