// Dashboard JavaScript
const API_BASE = '/admin/api';

// Check authentication
function checkAuth() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Get user info
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

// Update user info in header
function updateUserInfo() {
    const user = getUser();
    if (user) {
        document.getElementById('userName').textContent = user.name || 'Admin';
        document.getElementById('userAvatar').textContent = (user.name || 'A').charAt(0).toUpperCase();
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profileRole').value = user.role || '';
    }
}

// API request helper
async function apiRequest(endpoint, method = 'GET', body = null) {
    const accessToken = localStorage.getItem('accessToken');
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show form message
function showFormMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `form-message show ${type}`;
}

// Navigate between sections
function navigateTo(section) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.add('hidden');
    });
    document.getElementById(`${section}Section`).classList.remove('hidden');
    
    // Update page title
    const titles = {
        overview: 'Dashboard Overview',
        applications: 'Applications Management',
        documents: 'Documents Management',
        settings: 'Admin Settings'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;
}

// Load dashboard stats
async function loadStats() {
    try {
        const [appsRes, docsRes] = await Promise.all([
            apiRequest('/applications'),
            apiRequest('/documents')
        ]);
        
        const applications = appsRes.data || [];
        const documents = docsRes.data || [];
        
        document.getElementById('totalApplications').textContent = applications.length;
        document.getElementById('totalDocuments').textContent = documents.length;
        
        const pending = applications.filter(a => a.status === 'pending').length;
        const approved = applications.filter(a => a.status === 'approved').length;
        
        document.getElementById('pendingApplications').textContent = pending;
        document.getElementById('approvedApplications').textContent = approved;
        
        // Load recent applications
        loadRecentApplications(applications.slice(0, 5));
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Failed to load stats', 'error');
    }
}

// Load recent applications
function loadRecentApplications(applications) {
    const tbody = document.getElementById('recentApplications');
    
    if (applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-text">No applications found</td></tr>';
        return;
    }
    
    tbody.innerHTML = applications.map(app => `
        <tr>
            <td>${app._id.slice(-6)}</td>
            <td>${app.applicantName || 'N/A'}</td>
            <td>${app.applicationType || 'General'}</td>
            <td><span class="status-badge ${app.status}">${app.status}</span></td>
            <td>${new Date(app.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-btn view" onclick="viewApplication('${app._id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load all applications
async function loadApplications() {
    try {
        const response = await apiRequest('/applications');
        const applications = response.data || [];
        
        const tbody = document.getElementById('applicationsTableBody');
        
        if (applications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-text">No applications found</td></tr>';
            return;
        }
        
        tbody.innerHTML = applications.map(app => `
            <tr>
                <td>${app._id.slice(-6)}</td>
                <td>${app.applicantName || 'N/A'}</td>
                <td>${app.applicationType || 'General'}</td>
                <td><span class="status-badge ${app.status}">${app.status}</span></td>
                <td>${new Date(app.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn view" onclick="viewApplication('${app._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading applications:', error);
        showToast('Failed to load applications', 'error');
    }
}

// Load all documents
async function loadDocuments() {
    try {
        const response = await apiRequest('/documents');
        const documents = response.data || [];
        
        const tbody = document.getElementById('documentsTableBody');
        
        if (documents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-text">No documents found</td></tr>';
            return;
        }
        
        tbody.innerHTML = documents.map(doc => `
            <tr>
                <td>${doc._id.slice(-6)}</td>
                <td>${doc.originalName || doc.filename || 'Untitled'}</td>
                <td>${doc.mimeType || 'Unknown'}</td>
                <td>${formatFileSize(doc.size || 0)}</td>
                <td>${new Date(doc.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn view" onclick="downloadDocument('${doc._id}')">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading documents:', error);
        showToast('Failed to load documents', 'error');
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// View application details
async function viewApplication(id) {
    try {
        const response = await apiRequest(`/applications/${id}`);
        const app = response.data;
        
        const modal = document.getElementById('applicationModal');
        const modalBody = document.getElementById('applicationModalBody');
        
        modalBody.innerHTML = `
            <div style="display: grid; gap: 16px;">
                <div><strong>Applicant Name:</strong> ${app.applicantName || 'N/A'}</div>
                <div><strong>Email:</strong> ${app.email || 'N/A'}</div>
                <div><strong>Phone:</strong> ${app.phone || 'N/A'}</div>
                <div><strong>Type:</strong> ${app.applicationType || 'General'}</div>
                <div><strong>Status:</strong> <span class="status-badge ${app.status}">${app.status}</span></div>
                <div><strong>Created:</strong> ${new Date(app.createdAt).toLocaleString()}</div>
                ${app.description ? `<div><strong>Description:</strong><br>${app.description}</div>` : ''}
            </div>
        `;
        
        // Store current app ID for approval/rejection
        modal.dataset.applicationId = id;
        
        modal.classList.add('show');
    } catch (error) {
        console.error('Error loading application:', error);
        showToast('Failed to load application details', 'error');
    }
}

// Download document
async function downloadDocument(id) {
    try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE}/documents/${id}/download`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showToast('Failed to download document', 'error');
        }
    } catch (error) {
        console.error('Error downloading document:', error);
        showToast('Failed to download document', 'error');
    }
}

// Close modal
function closeModal() {
    document.getElementById('applicationModal').classList.remove('show');
}

// Approve application
async function approveApplication() {
    const modal = document.getElementById('applicationModal');
    const id = modal.dataset.applicationId;
    
    if (!id) return;
    
    try {
        await apiRequest(`/applications/${id}/approve`, 'POST');
        showToast('Application approved successfully', 'success');
        closeModal();
        loadApplications();
        loadStats();
    } catch (error) {
        showToast(error.message || 'Failed to approve application', 'error');
    }
}

// Reject application
async function rejectApplication() {
    const modal = document.getElementById('applicationModal');
    const id = modal.dataset.applicationId;
    
    if (!id) return;
    
    try {
        await apiRequest(`/applications/${id}/reject`, 'POST');
        showToast('Application rejected', 'success');
        closeModal();
        loadApplications();
        loadStats();
    } catch (error) {
        showToast(error.message || 'Failed to reject application', 'error');
    }
}

// Change password
async function changePassword(currentPassword, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        showFormMessage('passwordMessage', 'New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showFormMessage('passwordMessage', 'Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        const response = await apiRequest('/auth/change-password', 'POST', {
            currentPassword,
            newPassword
        });
        
        showFormMessage('passwordMessage', 'Password changed successfully! Please log in again.', 'success');
        
        // Clear form
        document.getElementById('changePasswordForm').reset();
        
        // Logout after 2 seconds
        setTimeout(() => {
            logout();
        }, 2000);
    } catch (error) {
        showFormMessage('passwordMessage', error.message || 'Failed to change password', 'error');
    }
}

// Logout
function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ refreshToken })
    }).finally(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    updateUserInfo();
    loadStats();
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.section);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Refresh buttons
    document.getElementById('refreshAppsBtn').addEventListener('click', loadApplications);
    document.getElementById('refreshDocsBtn').addEventListener('click', loadDocuments);
    
    // Modal
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    document.getElementById('applicationModal').addEventListener('click', (e) => {
        if (e.target.id === 'applicationModal') closeModal();
    });
    
    // Approve/Reject buttons
    document.getElementById('approveAppBtn').addEventListener('click', approveApplication);
    document.getElementById('rejectAppBtn').addEventListener('click', rejectApplication);
    
    // Change password form
    document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        changePassword(currentPassword, newPassword, confirmPassword);
    });
    
    // Close form message on input
    document.querySelectorAll('#changePasswordForm input').forEach(input => {
        input.addEventListener('input', () => {
            document.getElementById('passwordMessage').classList.remove('show');
        });
    });
});
