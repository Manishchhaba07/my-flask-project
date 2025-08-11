// Dashboard JavaScript functionality

let currentUser = null;
let currentSection = 'overview';
let notifications = [];
let unreadCount = 0;
let currentNotificationFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthAndLoadDashboard();
    
    // Setup navigation
    setupSidebarNavigation();
    
    // Setup forms
    setupProjectForm();
    
    // Setup logout
    setupLogout();
    
    // Setup notifications
    setupNotifications();
    
    // Start notification polling
    startNotificationPolling();
    
    // Start real-time clock updates
    startRealTimeUpdates();
});

async function checkAuthAndLoadDashboard() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserGreeting();
            loadDashboardData();
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

function updateUserGreeting() {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl && currentUser) {
        greetingEl.textContent = `Welcome, ${currentUser.username}!`;
    }
}

function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    console.log('Setting up navigation for', navItems.length, 'items');
    
    navItems.forEach(item => {
        const section = item.getAttribute('data-section');
        console.log('Adding listener for section:', section);
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Navigation clicked:', section);
            
            if (section) {
                switchSection(section);
            }
        });
    });
}

function switchSection(section) {
    console.log('Switching to section:', section);
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-section="${section}"]`);
    if (navItem) {
        navItem.classList.add('active');
        console.log('Added active class to nav item');
    } else {
        console.error('Nav item not found for section:', section);
    }
    
    // Show/hide content sections
    document.querySelectorAll('.content-section').forEach(sectionEl => {
        sectionEl.classList.remove('active');
    });
    const contentSection = document.getElementById(section);
    if (contentSection) {
        contentSection.classList.add('active');
        console.log('Showed content section:', section);
    } else {
        console.error('Content section not found:', section);
    }
    
    currentSection = section;
    
    // Load section-specific data
    loadSectionData(section);
}

async function loadSectionData(section) {
    switch(section) {
        case 'overview':
            loadDashboardStats();
            break;
        case 'my-projects':
            loadUserProjects();
            break;
        case 'collaborations':
            loadCollaborations();
            break;
        case 'team':
            loadTeam();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

async function loadDashboardData() {
    await loadDashboardStats();
    // Load notification count for sidebar
    try {
        const response = await fetch('/api/notifications/count');
        if (response.ok) {
            const data = await response.json();
            unreadCount = data.unread_count || 0;
            updateNotificationCount();
        }
    } catch (error) {
        console.log('Error loading notification count:', error);
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data);
            displayRecentProjects(data.projects);
        } else {
            console.error('Failed to load dashboard stats');
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function updateDashboardStats(data) {
    document.getElementById('total-projects-count').textContent = data.total_projects;
    document.getElementById('total-funding-amount').textContent = `$${data.total_funding.toFixed(2)}`;
    document.getElementById('total-votes-count').textContent = data.total_votes;
    document.getElementById('total-collabs-count').textContent = data.total_collaborations || 0;
    
    // Update trend data with real statistics
    updateTrendData(data);
}

function updateTrendData(data) {
    // Calculate trends based on recent activity (last 7 days)
    const projectsTrend = document.getElementById('projects-trend');
    const fundingTrend = document.getElementById('funding-trend');
    const votesTrend = document.getElementById('votes-trend');
    const collabsTrend = document.getElementById('collabs-trend');
    
    // For now, show growth indicators if there's data
    if (data.total_projects > 0) {
        projectsTrend.textContent = `${data.total_projects} total`;
        projectsTrend.className = 'stat-trend positive';
    } else {
        projectsTrend.textContent = 'Create your first project';
        projectsTrend.className = 'stat-trend neutral';
    }
    
    if (data.total_funding > 0) {
        fundingTrend.textContent = `$${data.total_funding.toFixed(2)} raised`;
        fundingTrend.className = 'stat-trend positive';
    } else {
        fundingTrend.textContent = 'No funding yet';
        fundingTrend.className = 'stat-trend neutral';
    }
    
    if (data.total_votes > 0) {
        votesTrend.textContent = `${data.total_votes} total votes`;
        votesTrend.className = 'stat-trend positive';
    } else {
        votesTrend.textContent = 'No votes yet';
        votesTrend.className = 'stat-trend neutral';
    }
    
    const collabCount = data.total_collaborations || 0;
    if (collabCount > 0) {
        collabsTrend.textContent = `${collabCount} active`;
        collabsTrend.className = 'stat-trend positive';
    } else {
        collabsTrend.textContent = 'No collaborations yet';
        collabsTrend.className = 'stat-trend neutral';
    }
}

function displayRecentProjects(projects) {
    const container = document.getElementById('recent-projects');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No projects yet</h3>
                <p>Create your first project to get started!</p>
            </div>
        `;
        return;
    }
    
    const recentProjects = projects.slice(0, 5);
    container.innerHTML = recentProjects.map(project => `
        <div class="activity-item">
            <div class="activity-info">
                <h4>${escapeHtml(project.title)}</h4>
                <p>${project.category} • Created <span data-timestamp="${project.created_at}">${formatDate(project.created_at)}</span></p>
            </div>
            <div class="activity-stats">
                <div class="activity-stat">
                    <i class="fas fa-thumbs-up"></i>
                    <span>${project.vote_count}</span>
                </div>
                <div class="activity-stat">
                    <i class="fas fa-dollar-sign"></i>
                    <span>$${project.current_funding.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupProjectForm() {
    const form = document.getElementById('project-form');
    if (form) {
        form.addEventListener('submit', handleProjectSubmission);
    }
    
    // Setup word count for project description
    const descriptionTextarea = document.getElementById('project-description');
    const wordCountSpan = document.getElementById('word-count');
    
    if (descriptionTextarea && wordCountSpan) {
        descriptionTextarea.addEventListener('input', function() {
            const words = this.value.trim().split(/\s+/).filter(word => word.length > 0);
            const wordCount = words.length;
            wordCountSpan.textContent = wordCount;
            
            // Update styling based on word count
            const wordCountContainer = wordCountSpan.parentElement;
            if (wordCount < 50) {
                wordCountContainer.style.color = '#dc3545'; // Red
                wordCountContainer.style.fontWeight = 'bold';
            } else {
                wordCountContainer.style.color = '#28a745'; // Green
                wordCountContainer.style.fontWeight = 'normal';
            }
        });
    }
    
    // Setup file upload functionality
    // File upload functionality removed
}

// File upload functionality removed as requested

// File upload functions removed as requested

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Project CRUD Functions
async function editProject(projectId) {
    try {
        // Fetch project details
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch project details');
        }
        
        const data = await response.json();
        const project = data.project;
        
        // Create edit modal
        const modalHtml = `
            <div class="modal-overlay" id="edit-project-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> Edit Project</h2>
                        <button class="modal-close" onclick="closeEditModal()">&times;</button>
                    </div>
                    <form id="edit-project-form">
                        <div class="form-group">
                            <label for="edit-title">Project Title</label>
                            <input type="text" id="edit-title" value="${escapeHtml(project.title)}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-category">Category</label>
                            <select id="edit-category" required>
                                <option value="technology" ${project.category === 'technology' ? 'selected' : ''}>Technology</option>
                                <option value="healthcare" ${project.category === 'healthcare' ? 'selected' : ''}>Healthcare</option>
                                <option value="education" ${project.category === 'education' ? 'selected' : ''}>Education</option>
                                <option value="environment" ${project.category === 'environment' ? 'selected' : ''}>Environment</option>
                                <option value="social" ${project.category === 'social' ? 'selected' : ''}>Social Impact</option>
                                <option value="business" ${project.category === 'business' ? 'selected' : ''}>Business</option>
                                <option value="arts" ${project.category === 'arts' ? 'selected' : ''}>Arts & Creative</option>
                                <option value="other" ${project.category === 'other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-funding">Funding Goal ($)</label>
                            <input type="number" id="edit-funding" value="${project.funding_goal}" min="0" step="100">
                        </div>
                        <div class="form-group">
                            <label for="edit-description">Description</label>
                            <textarea id="edit-description" rows="6" required>${escapeHtml(project.description)}</textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="cancel-btn" onclick="closeEditModal()">Cancel</button>
                            <button type="submit" class="save-btn">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Handle form submission
        document.getElementById('edit-project-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProject(projectId);
        });
        
    } catch (error) {
        showMessage('Error loading project details: ' + error.message, 'error');
    }
}

async function updateProject(projectId) {
    try {
        const title = document.getElementById('edit-title').value;
        const category = document.getElementById('edit-category').value;
        const funding = document.getElementById('edit-funding').value;
        const description = document.getElementById('edit-description').value;
        
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                category: category,
                fundingGoal: funding,
                description: description
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Project updated successfully!', 'success');
            closeEditModal();
            loadDashboardStats(); // Refresh the project list
        } else {
            showMessage(data.error || 'Failed to update project', 'error');
        }
        
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

async function deleteProject(projectId, projectTitle) {
    if (!confirm(`Are you sure you want to delete "${projectTitle}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Project deleted successfully!', 'success');
            loadDashboardStats(); // Refresh the project list
        } else {
            showMessage(data.error || 'Failed to delete project', 'error');
        }
        
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-project-modal');
    if (modal) {
        modal.remove();
    }
}

async function handleProjectSubmission(e) {
    e.preventDefault();
    
    const title = document.getElementById('project-title').value;
    const category = document.getElementById('project-category').value;
    const description = document.getElementById('project-description').value;
    const fundingGoal = document.getElementById('funding-goal').value;
    
    // Validate minimum word count for description
    const words = description.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length < 50) {
        showMessage('Project description must be at least 50 words. Please provide more details about your project idea.', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('.submit-btn');
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Project...';
    
    try {
        // Send project data as JSON (no file uploads)
        const projectData = {
            title: title,
            category: category,
            description: description,
            fundingGoal: fundingGoal || '0'
        };
        
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Project created successfully!', 'success');
            
            // Reset form
            e.target.reset();
            
            // Refresh dashboard data
            loadDashboardStats();
            
            // Switch to my projects section
            switchSection('my-projects');
        } else {
            showMessage(data.error || 'Failed to create project', 'error');
        }
    } catch (error) {
        console.error('Project creation error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Launch Project';
    }
}

async function loadUserProjects() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            displayUserProjects(data.projects);
        }
    } catch (error) {
        console.error('Error loading user projects:', error);
    }
}

function displayUserProjects(projects) {
    const container = document.getElementById('user-projects');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-plus-circle"></i>
                <h3>No projects yet</h3>
                <p>Create your first project to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="user-project-card">
            <div class="project-header">
                <h3>${escapeHtml(project.title)}</h3>
                <div class="project-actions">
                    <span class="project-status ${project.status}">${project.status}</span>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="event.stopPropagation(); editProject(${project.id})" title="Edit Project">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteProject(${project.id}, '${escapeHtml(project.title)}')" title="Delete Project">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="project-meta">
                <span class="project-category">${project.category}</span>
                <span class="project-date" data-timestamp="${project.created_at}">${formatDate(project.created_at)}</span>
            </div>
            <p class="project-description">${escapeHtml(project.description.substring(0, 140))}${project.description.length > 140 ? '...' : ''}</p>
            <div class="project-stats">
                <div class="project-stat">
                    <i class="fas fa-thumbs-up"></i>
                    <span>${project.vote_count} votes</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-dollar-sign"></i>
                    <span>$${project.current_funding.toFixed(0)} / $${project.funding_goal.toFixed(0)}</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-users"></i>
                    <span>${project.collaboration_count} collaborators</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-comments"></i>
                    <span>${project.comment_count} comments</span>
                </div>
            </div>
            <button class="project-view-details" onclick="openProjectDetails(${project.id})">
                <i class="fas fa-eye"></i> View Details & Manage
            </button>
        </div>
    `).join('');
}

async function loadCollaborations() {
    const container = document.getElementById('collaboration-requests');
    if (!container) return;
    
    try {
        const response = await fetch('/api/collaborations');
        if (response.ok) {
            const data = await response.json();
            displayCollaborations(data.collaborations || []);
        } else {
            displayEmptyCollaborations();
        }
    } catch (error) {
        console.error('Error loading collaborations:', error);
        displayEmptyCollaborations();
    }
}

function displayCollaborations(collaborations) {
    const container = document.getElementById('collaboration-requests');
    if (!container) return;
    
    if (collaborations.length === 0) {
        displayEmptyCollaborations();
        return;
    }
    
    container.innerHTML = collaborations.map(collab => `
        <div class="collaboration-item">
            <div class="collaboration-header">
                <div class="collaboration-user">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(collab.requester?.full_name || 'Unknown User')}</span>
                </div>
                <span class="collaboration-status ${collab.status}">${collab.status}</span>
            </div>
            <div class="collaboration-project">
                <strong>Project:</strong> ${escapeHtml(collab.project?.title || 'Unknown Project')}
            </div>
            <div class="collaboration-message">
                "${escapeHtml(collab.message || 'No message provided')}"
            </div>
            <div class="collaboration-date">
                Requested <span data-timestamp="${collab.created_at}">${formatDate(collab.created_at)}</span>
            </div>
            ${collab.status === 'pending' ? `
                <div class="collaboration-actions">
                    <button class="action-btn accept" onclick="handleCollaborationResponse(${collab.id}, 'accept')">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="action-btn reject" onclick="handleCollaborationResponse(${collab.id}, 'reject')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function displayEmptyCollaborations() {
    const container = document.getElementById('collaboration-requests');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-handshake"></i>
            <h3>No collaboration requests</h3>
            <p>Collaboration requests will appear here when other users want to work with you.</p>
        </div>
    `;
}

async function handleCollaborationResponse(collabId, action) {
    try {
        const response = await fetch(`/api/collaborations/${collabId}/${action}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`Collaboration request ${action}ed successfully!`, 'success');
            loadCollaborations(); // Reload collaborations
            
            // If accepted, reload team data to show new team member
            if (action === 'accept') {
                if (currentSection === 'team') {
                    loadTeam();
                }
                // Also reload notification count
                try {
                    const countResponse = await fetch('/api/notifications/count');
                    if (countResponse.ok) {
                        const countData = await countResponse.json();
                        unreadCount = countData.unread_count || 0;
                        updateNotificationCount();
                    }
                } catch (e) {
                    console.log('Error updating notification count:', e);
                }
            }
        } else {
            showMessage(data.error || `Error ${action}ing collaboration request`, 'error');
        }
    } catch (error) {
        console.error(`Error ${action}ing collaboration:`, error);
        showMessage(`Error ${action}ing collaboration request`, 'error');
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error logging out', 'error');
    }
}

// Utility functions - Real-time date formatting
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        // Always return only the date part, no time
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container') || createMessageContainer();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}

// Notification System
function setupNotifications() {
    // Setup notification filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentNotificationFilter = this.getAttribute('data-filter');
            displayFilteredNotifications();
        });
    });
    
    // Setup notification action buttons
    const markAllReadBtn = document.getElementById('mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    }
    
    const clearAllBtn = document.getElementById('clear-notifications');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllNotifications);
    }
}

async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
            const data = await response.json();
            notifications = data.notifications || [];
            unreadCount = data.unread_count || 0;
            console.log('Loaded notifications:', notifications.length, 'unread:', unreadCount);
            updateNotificationCount();
            displayFilteredNotifications();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        displayEmptyNotifications('Error loading notifications');
    }
}

function updateNotificationCount() {
    const countEl = document.getElementById('notification-count');
    if (countEl) {
        console.log('Updating notification count:', unreadCount);
        if (unreadCount > 0) {
            countEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
            countEl.setAttribute('data-count', unreadCount);
            countEl.style.display = 'inline-block';
        } else {
            countEl.textContent = '';
            countEl.setAttribute('data-count', '0');
            countEl.style.display = 'none';
        }
    }
}

function displayFilteredNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    
    let filteredNotifications = notifications;
    
    if (currentNotificationFilter !== 'all') {
        filteredNotifications = notifications.filter(n => n.type === currentNotificationFilter);
    }
    
    if (filteredNotifications.length === 0) {
        displayEmptyNotifications('No notifications found');
        return;
    }
    
    container.innerHTML = filteredNotifications.map(notification => `
        <div class="notification-item ${notification.is_read ? '' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon ${notification.type}">
                ${getNotificationIcon(notification.type)}
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <div class="notification-message">${escapeHtml(notification.message)}</div>
                <div class="notification-time" data-timestamp="${notification.created_at}">${formatNotificationTime(notification.created_at)}</div>
                ${!notification.is_read ? `
                    <div class="notification-actions">
                        <button class="notification-action" onclick="markNotificationAsRead(${notification.id})">
                            <i class="fas fa-check"></i> Mark as Read
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function displayEmptyNotifications(message = 'No notifications yet') {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-bell"></i>
            <h3>${message}</h3>
            <p>You'll see notifications about your projects, collaborations, and interactions here.</p>
        </div>
    `;
}

function getNotificationIcon(type) {
    const icons = {
        'like': '<i class="fas fa-thumbs-up"></i>',
        'likes': '<i class="fas fa-thumbs-up"></i>',
        'comment': '<i class="fas fa-comment"></i>',
        'comments': '<i class="fas fa-comment"></i>',
        'collaboration': '<i class="fas fa-handshake"></i>',
        'collaborations': '<i class="fas fa-handshake"></i>',
        'project': '<i class="fas fa-rocket"></i>',
        'projects': '<i class="fas fa-rocket"></i>',
        'team_chat': '<i class="fas fa-comments"></i>'
    };
    return icons[type] || '<i class="fas fa-bell"></i>';
}

function formatNotificationTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
        return 'Just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function formatChatMessageTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Update the notification in the local array
            const notification = notifications.find(n => n.id === notificationId);
            if (notification && !notification.is_read) {
                notification.is_read = true;
                unreadCount = Math.max(0, unreadCount - 1);
                updateNotificationCount();
                displayFilteredNotifications();
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        showMessage('Error updating notification', 'error');
    }
}

async function markAllNotificationsAsRead() {
    try {
        const response = await fetch('/api/notifications/mark-all-read', {
            method: 'POST'
        });
        
        if (response.ok) {
            notifications.forEach(n => n.is_read = true);
            unreadCount = 0;
            updateNotificationCount();
            displayFilteredNotifications();
            showMessage('All notifications marked as read', 'success');
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showMessage('Error updating notifications', 'error');
    }
}

async function clearAllNotifications() {
    if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/notifications/clear-all', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            notifications = [];
            unreadCount = 0;
            updateNotificationCount();
            displayEmptyNotifications();
            showMessage('All notifications cleared', 'success');
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
        showMessage('Error clearing notifications', 'error');
    }
}

function startNotificationPolling() {
    // Poll for new notifications every 30 seconds
    setInterval(async () => {
        try {
            const response = await fetch('/api/notifications/count');
            if (response.ok) {
                const data = await response.json();
                const newUnreadCount = data.unread_count || 0;
                
                if (newUnreadCount > unreadCount) {
                    // New notifications arrived
                    if (currentSection === 'notifications') {
                        loadNotifications();
                    } else {
                        unreadCount = newUnreadCount;
                        updateNotificationCount();
                    }
                }
            }
        } catch (error) {
            console.log('Notification polling error:', error);
        }
    }, 30000);
}

// Real-time updates for timestamps
function startRealTimeUpdates() {
    // Update all timestamps every minute
    setInterval(updateAllTimestamps, 60000);
}

function updateAllTimestamps() {
    // Update project timestamps
    document.querySelectorAll('[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            element.textContent = formatDate(timestamp);
        }
    });
    
    // Update notification timestamps
    document.querySelectorAll('.notification-time[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            element.textContent = formatNotificationTime(timestamp);
        }
    });
}

// Project Details Modal
async function openProjectDetails(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
            const data = await response.json();
            displayProjectDetails(data.project);
        } else {
            showMessage('Error loading project details', 'error');
        }
    } catch (error) {
        console.error('Error loading project details:', error);
        showMessage('Error loading project details', 'error');
    }
}

function displayProjectDetails(project) {
    const modal = document.getElementById('project-modal');
    const title = document.getElementById('modal-project-title');
    const content = document.getElementById('project-modal-content');
    
    title.textContent = project.title;
    
    const fundingProgress = project.funding_goal > 0 ? 
        (project.current_funding / project.funding_goal * 100).toFixed(1) : 0;
    
    content.innerHTML = `
        <div class="project-detail-item">
            <label>Category:</label>
            <p>${escapeHtml(project.category)}</p>
        </div>
        
        <div class="project-detail-item">
            <label>Status:</label>
            <p><span class="project-status ${project.status}">${project.status}</span></p>
        </div>
        
        <div class="project-detail-item">
            <label>Description:</label>
            <p>${escapeHtml(project.description)}</p>
        </div>
        
        <div class="project-stats-detail">
            <div class="stat-detail-card">
                <i class="fas fa-thumbs-up"></i>
                <div class="stat-value">${project.vote_count}</div>
                <div class="stat-label">Votes</div>
            </div>
            <div class="stat-detail-card">
                <i class="fas fa-dollar-sign"></i>
                <div class="stat-value">$${project.current_funding.toFixed(2)}</div>
                <div class="stat-label">Raised / $${project.funding_goal.toFixed(2)}</div>
            </div>
            <div class="stat-detail-card">
                <i class="fas fa-users"></i>
                <div class="stat-value">${project.collaboration_count}</div>
                <div class="stat-label">Collaborators</div>
            </div>
            <div class="stat-detail-card">
                <i class="fas fa-comments"></i>
                <div class="stat-value">${project.comment_count}</div>
                <div class="stat-label">Comments</div>
            </div>
        </div>
        
        ${project.funding_goal > 0 ? `
        <div class="project-detail-item">
            <label>Funding Progress:</label>
            <div style="background: #f0f0f0; border-radius: 10px; padding: 1rem; margin-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>${fundingProgress}% funded</span>
                    <span>$${project.current_funding.toFixed(2)} / $${project.funding_goal.toFixed(2)}</span>
                </div>
                <div style="background: #ddd; height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6a11cb, #2575fc); height: 100%; width: ${fundingProgress}%; transition: width 0.3s ease;"></div>
                </div>
            </div>
        </div>
        ` : ''}
        
        <div class="project-detail-item">
            <label>Created:</label>
            <p>${formatDate(project.created_at)}</p>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeProjectDetails() {
    const modal = document.getElementById('project-modal');
    modal.classList.remove('show');
}

// Global function for HTML onclick
function closeProjectModal() {
    closeProjectDetails();
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const projectModal = document.getElementById('project-modal');
    
    if (e.target === projectModal) {
        closeProjectDetails();
    }
});

// Load team members
async function loadTeam() {
    try {
        const response = await fetch('/api/user/team');
        if (response.ok) {
            const data = await response.json();
            displayTeamMembers(data.team_members || []);
        } else {
            console.error('Error loading team members');
            displayEmptyTeam();
        }
    } catch (error) {
        console.error('Error loading team members:', error);
        displayEmptyTeam();
    }
}

function displayTeamMembers(teamMembers) {
    const container = document.getElementById('team-container');
    if (!container) return;

    if (teamMembers.length === 0) {
        displayEmptyTeam();
        return;
    }

    // Group team members by project
    const projectGroups = {};
    teamMembers.forEach(member => {
        if (!projectGroups[member.project_id]) {
            projectGroups[member.project_id] = {
                project_title: member.project_title,
                members: []
            };
        }
        projectGroups[member.project_id].members.push(member);
    });

    container.innerHTML = `
        <div class="team-projects">
            ${Object.values(projectGroups).map(project => `
                <div class="project-team-section">
                    <h3 class="project-title">
                        <i class="fas fa-project-diagram"></i> ${escapeHtml(project.project_title)}
                    </h3>
                    <div class="team-grid">
                        ${project.members.map(member => `
                            <div class="team-member-card">
                                <div class="member-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="member-info">
                                    <h4>${escapeHtml(member.user.full_name)}</h4>
                                    <p class="member-username">@${escapeHtml(member.user.username)}</p>
                                    <p class="member-college">${escapeHtml(member.user.college || 'No college specified')}</p>
                                    <p class="member-role">${member.is_owner ? 'Project Owner' : 'Collaborator'}</p>
                                </div>
                                <div class="member-actions">
                                    <button class="message-btn" onclick="openProjectChatSidebar(${member.project_id}, '${escapeHtml(project.project_title)}')">
                                        <i class="fas fa-comments"></i> Team Chat
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function displayEmptyTeam() {
    const container = document.getElementById('team-container');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-users"></i>
            <h3>No Team Members Yet</h3>
            <p>Accept collaboration requests to form your team!</p>
        </div>
    `;
}

// Chat sidebar functionality
let currentChatProject = null;

async function openProjectChatSidebar(projectId, projectTitle) {
    currentChatProject = { id: projectId, title: projectTitle };
    
    const sidebar = document.getElementById('chat-sidebar');
    const container = document.querySelector('.dashboard-container');
    const title = document.getElementById('chat-sidebar-title');
    
    title.textContent = `${projectTitle} - Team Chat`;
    
    sidebar.classList.add('show');
    container.classList.add('chat-open');
    
    await loadChatParticipants(projectId);
    await loadSidebarChatMessages(projectId);
}

function closeChatSidebar() {
    const sidebar = document.getElementById('chat-sidebar');
    const container = document.querySelector('.dashboard-container');
    
    sidebar.classList.remove('show');
    container.classList.remove('chat-open');
    
    currentChatProject = null;
}

async function loadChatParticipants(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/participants`);
        if (response.ok) {
            const data = await response.json();
            displayChatParticipants(data.participants || []);
        }
    } catch (error) {
        console.error('Error loading participants:', error);
    }
}

function displayChatParticipants(participants) {
    const container = document.getElementById('chat-participants-list');
    if (!container) return;
    
    container.innerHTML = participants.map(participant => `
        <div class="participant-badge ${participant.is_owner ? 'owner' : ''}">
            <i class="fas fa-user"></i> ${escapeHtml(participant.user.full_name)}
            ${participant.is_owner ? ' (Owner)' : ''}
        </div>
    `).join('');
}

async function loadSidebarChatMessages(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/chat`);
        if (response.ok) {
            const data = await response.json();
            displaySidebarChatMessages(data.messages || []);
        }
    } catch (error) {
        console.error('Error loading chat messages:', error);
    }
}

function displaySidebarChatMessages(messages) {
    const container = document.getElementById('sidebar-chat-messages');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 2rem;">
                <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>Start a conversation with your team!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(message => `
        <div class="chat-message">
            <div class="message-header">
                <span class="message-sender">${escapeHtml(message.author.full_name)}</span>
                <span class="message-time">${formatChatMessageTime(message.created_at)}</span>
            </div>
            <div class="message-text">${escapeHtml(message.message)}</div>
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

async function sendSidebarMessage() {
    if (!currentChatProject) return;
    
    const input = document.getElementById('sidebar-chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const sendBtn = document.querySelector('.chat-input-area .send-message-btn');
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/projects/${currentChatProject.id}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        if (response.ok) {
            input.value = '';
            await loadSidebarChatMessages(currentChatProject.id);
            
            // Refresh notification count after sending chat message
            // This ensures any new notifications are reflected in the badge
            try {
                const notificationResponse = await fetch('/api/notifications/count');
                if (notificationResponse.ok) {
                    const notificationData = await notificationResponse.json();
                    unreadCount = notificationData.unread_count || 0;
                    updateNotificationCount();
                }
            } catch (e) {
                console.log('Error refreshing notification count:', e);
            }
        } else {
            const data = await response.json();
            showMessage(data.error || 'Error sending message', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Error sending message', 'error');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendSidebarMessage();
    }
}

// Utility function for HTML escaping
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
