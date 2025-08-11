// Browse projects JavaScript functionality

let currentUser = null;
let currentPage = 1;
let currentFilters = {
    search: '',
    category: '',
    sort: 'recent'
};
let currentProject = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Setup filters and search
    setupFilters();
    
    // Setup modals
    setupModals();
    
    // Load initial projects
    loadProjects();
    
    // Check if specific project ID in URL
    checkForProjectInURL();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateNavbarForLoggedInUser();
            showCommentSection();
        }
    } catch (error) {
        console.log('User not authenticated');
    }
}

function updateNavbarForLoggedInUser() {
    const navAuth = document.getElementById('nav-auth');
    const dashboardLink = document.getElementById('dashboard-link');
    
    if (navAuth && currentUser) {
        navAuth.innerHTML = `
            <span class="user-greeting">Welcome, ${currentUser.username}!</span>
            <button class="logout-btn" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
        `;
    }
    
    if (dashboardLink) {
        dashboardLink.style.display = 'inline-flex';
    }
}

function showCommentSection() {
    const commentSection = document.getElementById('add-comment-section');
    if (commentSection) {
        commentSection.style.display = 'block';
    }
}

function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleCategoryFilter);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', handleSortFilter);
    }
}

function handleSearch(e) {
    currentFilters.search = e.target.value;
    resetAndLoadProjects();
}

function handleCategoryFilter(e) {
    currentFilters.category = e.target.value;
    resetAndLoadProjects();
}

function handleSortFilter(e) {
    currentFilters.sort = e.target.value;
    resetAndLoadProjects();
}

function resetAndLoadProjects() {
    currentPage = 1;
    document.getElementById('projects-grid').innerHTML = '';
    loadProjects();
}

async function loadProjects() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingEl = document.getElementById('loading');
    const noResultsEl = document.getElementById('no-results');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (noResultsEl) noResultsEl.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            per_page: 9,
            sort: currentFilters.sort
        });
        
        if (currentFilters.category) {
            params.append('category', currentFilters.category);
        }
        
        if (currentFilters.search) {
            params.append('search', currentFilters.search);
        }
        
        const response = await fetch(`/api/projects?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayProjects(data.projects, currentPage === 1);
            
            // Show/hide load more button
            if (loadMoreContainer) {
                if (currentPage < data.pages) {
                    loadMoreContainer.style.display = 'block';
                } else {
                    loadMoreContainer.style.display = 'none';
                }
            }
            
            // Show no results if no projects
            if (data.projects.length === 0 && currentPage === 1) {
                if (noResultsEl) noResultsEl.style.display = 'block';
            }
        } else {
            console.error('Failed to load projects');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showMessage('Error loading projects', 'error');
    } finally {
        isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
    }
}



function displayProjects(projects, clearExisting = false) {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return;
    
    if (clearExisting) {
        projectsGrid.innerHTML = '';
    }
    
    const projectsHTML = projects.map(project => `
        <div class="project-card" onclick="openProjectModal(${project.id})">
            <div class="project-content">
                ${currentUser && project.can_edit ? `
                    <div class="project-edit-overlay" onclick="event.stopPropagation()">
                        <button class="btn btn-sm btn-secondary" onclick="editProject(${project.id})" title="Edit Project">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProject(${project.id})" title="Delete Project">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
                <div class="project-header">
                    <span class="project-category">${project.category}</span>
                    <span class="project-date">${formatDate(project.created_at)}</span>
                </div>
                <h3 class="project-title">${escapeHtml(project.title)}</h3>
                <div class="project-owner">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(project.owner?.full_name || 'Unknown')}</span>
                </div>
                <div class="project-description-container">
                    <p class="project-description ${project.description.length > 150 ? 'truncated' : 'expanded'}" id="desc-${project.id}">
                        ${escapeHtml(project.description)}
                    </p>
                    ${project.description.length > 150 ? `
                        <button class="description-toggle" onclick="toggleDescription(${project.id}, event)" id="toggle-${project.id}">
                            Read More <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="project-stats">
                    <div class="project-stat">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${project.vote_count}</span>
                    </div>
                    <div class="project-stat">
                        <i class="fas fa-dollar-sign"></i>
                        <span>$${project.current_funding.toFixed(2)}</span>
                    </div>
                    <div class="project-stat">
                        <i class="fas fa-users"></i>
                        <span>${project.collaboration_count}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    projectsGrid.insertAdjacentHTML('beforeend', projectsHTML);
}

// Setup load more functionality
document.addEventListener('DOMContentLoaded', function() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            currentPage++;
            loadProjects();
        });
    }
});

function setupModals() {
    // Project modal
    const projectModal = document.getElementById('project-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
    // Setup action buttons
    setupActionButtons();
}



function setupActionButtons() {
    const voteBtn = document.getElementById('vote-btn');
    const collabBtn = document.getElementById('collab-btn');
    const donateBtn = document.getElementById('donate-btn');
    const submitCommentBtn = document.getElementById('submit-comment');
    
    if (voteBtn) {
        voteBtn.addEventListener('click', handleVote);
    }
    
    if (collabBtn) {
        collabBtn.addEventListener('click', openCollabModal);
    }
    
    if (donateBtn) {
        donateBtn.addEventListener('click', handleDonateRedirect);
    }
    
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', handleAddComment);
    }
    
    // Collaboration modal
    const sendCollabBtn = document.getElementById('send-collab-request');
    if (sendCollabBtn) {
        sendCollabBtn.addEventListener('click', handleCollabRequest);
    }
    
    // Donation modal
    const sendDonationBtn = document.getElementById('send-donation');
    if (sendDonationBtn) {
        sendDonationBtn.addEventListener('click', handleDonation);
    }
}

async function openProjectModal(projectId) {
    if (!currentUser) {
        showMessage('Please login to view project details', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
            const data = await response.json();
            currentProject = data.project;
            displayProjectModal(currentProject);
            loadProjectComments(projectId);
            
            const modal = document.getElementById('project-modal');
            modal.classList.add('show');
        } else {
            showMessage('Error loading project details', 'error');
        }
    } catch (error) {
        console.error('Error loading project:', error);
        showMessage('Error loading project details', 'error');
    }
}

function getProjectImageHTML(project) {
    // Check if project has image attachments
    if (project.attachments && project.attachments.length > 0) {
        const imageAttachment = project.attachments.find(att => 
            att.file_type && att.file_type.startsWith('image/')
        );
        if (imageAttachment) {
            return `<img src="/static/${imageAttachment.file_path}" alt="${escapeHtml(project.title)}" />`;
        }
    }
    // Default gradient background if no image - no placeholder div
    const gradients = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)',
        'linear-gradient(135deg, #a8edea, #fed6e3)'
    ];
    const gradient = gradients[project.id % gradients.length];
    return `<div style="background: ${gradient}; width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; font-weight: bold;">${escapeHtml(project.title).substring(0, 20)}...</div>`;
}

function displayProjectModal(project) {
    document.getElementById('modal-title').textContent = project.title;
    document.getElementById('modal-category').textContent = project.category;
    document.getElementById('modal-date').textContent = formatDate(project.created_at);
    document.getElementById('modal-owner').querySelector('span').textContent = escapeHtml(project.owner?.full_name || 'Unknown');
    document.getElementById('modal-votes').textContent = project.vote_count;
    document.getElementById('modal-funding').textContent = `$${project.current_funding.toFixed(2)}`;
    document.getElementById('modal-collabs').textContent = project.collaboration_count;
    document.getElementById('modal-goal').textContent = `$${project.funding_goal ? project.funding_goal.toFixed(2) : '0.00'}`;
    
    // Update modal image
    const modalImage = document.getElementById('modal-project-image');
    if (modalImage) {
        modalImage.innerHTML = getProjectImageHTML(project);
    }
    
    // Show attachments if any
    displayProjectAttachments(project);
    
    // Show full description in modal (no truncation needed)
    const descriptionEl = document.getElementById('modal-description');
    descriptionEl.innerHTML = escapeHtml(project.description);
    descriptionEl.className = 'project-description full';
    
    // Remove any expand button in modal view
    const expandBtn = descriptionEl.querySelector('.description-expand-btn');
    if (expandBtn) {
        expandBtn.remove();
    }
    
    // Update action buttons based on ownership
    const isOwner = currentUser && currentUser.id === project.owner?.id;
    const voteBtn = document.getElementById('vote-btn');
    const collabBtn = document.getElementById('collab-btn');
    const donateBtn = document.getElementById('donate-btn');
    
    // Add project management buttons for owner
    const projectActions = document.getElementById('project-actions');
    if (projectActions) {
        if (isOwner) {
            projectActions.innerHTML = `
                <button class="btn btn-secondary" onclick="editProject(${project.id})">
                    <i class="fas fa-edit"></i> Edit Project
                </button>
                <button class="btn btn-danger" onclick="deleteProject(${project.id})">
                    <i class="fas fa-trash"></i> Delete Project
                </button>
            `;
        } else {
            projectActions.innerHTML = '';
        }
    }
    
    if (isOwner) {
        if (collabBtn) collabBtn.disabled = true;
        if (collabBtn) collabBtn.textContent = 'Your Project';
    } else {
        if (collabBtn) collabBtn.disabled = false;
        if (collabBtn) collabBtn.innerHTML = '<i class="fas fa-handshake"></i> Collaborate';
    }
}

function displayProjectAttachments(project) {
    const attachmentsContainer = document.getElementById('modal-attachments');
    if (!attachmentsContainer) return;
    
    if (!project.attachments || project.attachments.length === 0) {
        attachmentsContainer.style.display = 'none';
        return;
    }
    
    attachmentsContainer.style.display = 'block';
    const attachmentsList = attachmentsContainer.querySelector('.attachments-list');
    
    attachmentsList.innerHTML = project.attachments.map(attachment => {
        const fileIcon = getFileIcon(attachment.file_type);
        const fileSize = formatFileSize(attachment.file_size);
        
        return `
            <div class="attachment-item">
                <div class="attachment-info">
                    <i class="${fileIcon}"></i>
                    <div class="attachment-details">
                        <span class="attachment-name">${escapeHtml(attachment.original_filename)}</span>
                        <span class="attachment-meta">${fileSize} • ${attachment.file_type}</span>
                    </div>
                </div>
                <a href="/static/${attachment.file_path}" target="_blank" class="attachment-download">
                    <i class="fas fa-download"></i>
                </a>
            </div>
        `;
    }).join('');
}

async function loadProjectComments(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/comments`);
        if (response.ok) {
            const data = await response.json();
            displayComments(data.comments);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color: #999; text-align: center;">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-author">${escapeHtml(comment.author?.full_name || 'Unknown')}</div>
                <div class="comment-date">${formatDate(comment.created_at)}</div>
                ${currentUser && comment.author && currentUser.id === comment.author.id ? `
                    <div class="comment-actions">
                        <button class="edit-comment-btn" onclick="editComment(${comment.id})" title="Edit Comment">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-comment-btn" onclick="deleteComment(${comment.id})" title="Delete Comment">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="comment-content">
                <p>${escapeHtml(comment.content)}</p>
            </div>
            <div class="comment-reactions">
                <button class="reaction-btn ${comment.user_reaction === 'like' ? 'active' : ''}" onclick="toggleCommentReaction(${comment.id}, 'like')">
                    <i class="fas fa-thumbs-up"></i> <span class="reaction-count">${comment.like_count || 0}</span>
                </button>
                <button class="reaction-btn ${comment.user_reaction === 'heart' ? 'active' : ''}" onclick="toggleCommentReaction(${comment.id}, 'heart')">
                    <i class="fas fa-heart"></i> <span class="reaction-count">${comment.heart_count || 0}</span>
                </button>
            </div>
        </div>
    `).join('');
}

async function handleVote() {
    if (!currentUser) {
        showMessage('Please login to vote', 'error');
        return;
    }
    
    if (!currentProject) return;
    
    const voteBtn = document.getElementById('vote-btn');
    voteBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/vote`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Vote updated successfully!', 'success');
            
            // Update vote count in modal
            document.getElementById('modal-votes').textContent = data.vote_count;
            currentProject.vote_count = data.vote_count;
            
            // Update vote button appearance
            voteBtn.classList.add('voted');
        } else {
            showMessage(data.error || 'Error voting', 'error');
        }
    } catch (error) {
        console.error('Vote error:', error);
        showMessage('Error voting', 'error');
    } finally {
        voteBtn.disabled = false;
    }
}

function openCollabModal() {
    if (!currentUser) {
        showMessage('Please login to collaborate', 'error');
        return;
    }
    
    const collabModal = document.getElementById('collab-modal');
    collabModal.classList.add('show');
}

async function handleCollabRequest() {
    const message = document.getElementById('collab-message').value;
    const sendBtn = document.getElementById('send-collab-request');
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/collaborate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Collaboration request sent successfully!', 'success');
            closeModals();
            document.getElementById('collab-message').value = '';
        } else {
            showMessage(data.error || 'Error sending collaboration request', 'error');
        }
    } catch (error) {
        console.error('Collaboration request error:', error);
        showMessage('Error sending collaboration request', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-handshake"></i> Send Request';
    }
}

function handleDonateRedirect() {
    if (!currentUser) {
        showMessage('Please login to donate', 'error');
        return;
    }
    
    if (!currentProject) {
        showMessage('Project information not available', 'error');
        return;
    }
    
    // Redirect to donation page with project ID
    window.location.href = `donate.html?project=${currentProject.id}`;
}

async function handleDonation() {
    const amount = parseFloat(document.getElementById('donation-amount').value);
    const message = document.getElementById('donation-message').value;
    const sendBtn = document.getElementById('send-donation');
    
    if (!amount || amount <= 0) {
        showMessage('Please enter a valid donation amount', 'error');
        return;
    }
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/donate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Donation successful! Thank you for your support!', 'success');
            
            // Update funding amount in modal
            document.getElementById('modal-funding').textContent = `$${data.new_funding.toFixed(2)}`;
            currentProject.current_funding = data.new_funding;
            
            closeModals();
            document.getElementById('donation-amount').value = '';
            document.getElementById('donation-message').value = '';
        } else {
            showMessage(data.error || 'Error processing donation', 'error');
        }
    } catch (error) {
        console.error('Donation error:', error);
        showMessage('Error processing donation', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-heart"></i> Donate Now';
    }
}

async function handleAddComment() {
    if (!currentUser) {
        showMessage('Please login to comment', 'error');
        return;
    }
    
    const content = document.getElementById('comment-input').value.trim();
    if (!content) {
        showMessage('Please enter a comment', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-comment');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Comment added successfully!', 'success');
            document.getElementById('comment-input').value = '';
            
            // Reload comments
            loadProjectComments(currentProject.id);
        } else {
            showMessage(data.error || 'Error adding comment', 'error');
        }
    } catch (error) {
        console.error('Comment error:', error);
        showMessage('Error adding comment', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Comment';
    }
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

function checkForProjectInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    if (projectId) {
        setTimeout(() => {
            openProjectModal(parseInt(projectId));
        }, 500);
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

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function toggleDescription(projectId, event) {
    event.stopPropagation(); // Prevent opening project modal
    
    const descElement = document.getElementById(`desc-${projectId}`);
    const toggleElement = document.getElementById(`toggle-${projectId}`);
    
    if (!descElement || !toggleElement) return;
    
    const isExpanded = descElement.classList.contains('expanded');
    
    if (isExpanded) {
        descElement.classList.remove('expanded');
        descElement.classList.add('truncated');
        toggleElement.innerHTML = 'Read More <i class="fas fa-chevron-down"></i>';
        toggleElement.classList.remove('expanded');
    } else {
        descElement.classList.remove('truncated');
        descElement.classList.add('expanded');
        toggleElement.innerHTML = 'Read Less <i class="fas fa-chevron-up"></i>';
        toggleElement.classList.add('expanded');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type = 'info') {
    // Remove popup messages - just log to console instead
    console.log(`${type}: ${message}`);
}

// Comment reaction and reply functions
async function toggleCommentReaction(commentId, reactionType) {
    if (!currentUser) {
        showMessage('Please login to react', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/comment/${commentId}/reaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reaction_type: reactionType
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                // Update both like and heart buttons based on server response
                const likeBtn = commentElement.querySelector(`[onclick*="'like'"]`);
                const heartBtn = commentElement.querySelector(`[onclick*="'heart'"]`);
                const likeCount = likeBtn.querySelector('.reaction-count');
                const heartCount = heartBtn.querySelector('.reaction-count');
                
                // Update counts
                likeCount.textContent = data.like_count || 0;
                heartCount.textContent = data.heart_count || 0;
                
                // Update active states - only one can be active at a time
                likeBtn.classList.toggle('active', data.user_reaction === 'like');
                heartBtn.classList.toggle('active', data.user_reaction === 'heart');
            }
            showMessage('Reaction updated!', 'success');
        } else {
            showMessage(data.error || 'Error updating reaction', 'error');
        }
    } catch (error) {
        console.error('Error toggling reaction:', error);
        showMessage('Error updating reaction', 'error');
    }
}



function cancelCommentReply(commentId) {
    const repliesContainer = document.getElementById(`comment-replies-${commentId}`);
    const replyForm = repliesContainer.querySelector('.comment-reply-form');
    if (replyForm) {
        replyForm.remove();
    }
}

async function submitCommentReply(commentId) {
    const repliesContainer = document.getElementById(`comment-replies-${commentId}`);
    const replyInput = repliesContainer.querySelector('.comment-reply-input');
    const content = replyInput.value.trim();

    if (!content) {
        alert('Please enter a reply');
        return;
    }

    const submitBtn = repliesContainer.querySelector('.btn-primary');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Replying...';

    try {
        const response = await fetch(`/api/projects/${currentProject.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            cancelCommentReply(commentId);
            
            // Reload comments to show the new comment
            loadProjectComments(currentProject.id);
        } else {
            alert(data.error || 'Error posting reply');
        }
    } catch (error) {
        console.error('Error submitting reply:', error);
        alert('Error posting reply');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Reply';
    }
}

function getFileIcon(fileType) {
    if (!fileType) return 'fas fa-file';
    
    if (fileType.startsWith('image/')) return 'fas fa-image';
    if (fileType.startsWith('video/')) return 'fas fa-video';
    if (fileType === 'application/pdf') return 'fas fa-file-pdf';
    if (fileType.includes('word')) return 'fas fa-file-word';
    if (fileType.includes('excel')) return 'fas fa-file-excel';
    if (fileType.includes('powerpoint')) return 'fas fa-file-powerpoint';
    
    return 'fas fa-file';
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}

// Comment CRUD Functions
async function editComment(commentId) {
    try {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentElement) return;
        
        const commentContent = commentElement.querySelector(".comment-content");
        const originalContent = commentContent.textContent.trim();
        
        // Create inline edit form
        const editForm = `
            <div class="comment-edit-form">
                <textarea class="edit-comment-textarea" rows="3">${escapeHtml(originalContent)}</textarea>
                <div class="comment-edit-actions">
                    <button class="save-comment-btn" onclick="saveCommentEdit(${commentId}, this, '${escapeHtml(originalContent)}')">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button class="cancel-comment-btn" onclick="cancelCommentEdit(${commentId}, this, '${escapeHtml(originalContent)}')">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        commentContent.innerHTML = editForm;
        
    } catch (error) {
        console.error("Error setting up comment edit:", error);
        showMessage("Error setting up comment edit", "error");
    }
}

async function saveCommentEdit(commentId, saveBtn, originalContent) {
    try {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        const textarea = commentElement.querySelector(".edit-comment-textarea");
        const newContent = textarea.value.trim();
        
        if (!newContent) {
            showMessage("Comment content cannot be empty", "error");
            return;
        }
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const response = await fetch(`/api/comments/${commentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content: newContent
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Replace edit form with updated content
            const commentContent = commentElement.querySelector(".comment-content");
            commentContent.innerHTML = `<p>${escapeHtml(newContent)} <em class="edit-indicator">(edited)</em></p>`;
            showMessage("Comment updated successfully!", "success");
        } else {
            showMessage(data.error || "Failed to update comment", "error");
            const commentContent = commentElement.querySelector(".comment-content");
            commentContent.innerHTML = `<p>${originalContent}</p>`;
        }
        
    } catch (error) {
        console.error("Network error:", error);
        showMessage("Network error while updating comment", "error");
    }
}

function cancelCommentEdit(commentId, cancelBtn, originalContent) {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    const commentContent = commentElement.querySelector(".comment-content");
    commentContent.innerHTML = `<p>${originalContent}</p>`;
}

async function deleteComment(commentId) {
    if (!confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: "DELETE"
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Remove comment from DOM
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                commentElement.remove();
            }
            showMessage("Comment deleted successfully!", "success");
        } else {
            showMessage(data.error || "Failed to delete comment", "error");
        }
        
    } catch (error) {
        console.error("Network error:", error);
        showMessage("Network error while deleting comment", "error");
    }
}

// Project CRUD Functions
async function editProject(projectId) {
    if (!currentUser) {
        showMessage('Please login to edit projects', 'error');
        return;
    }
    
    try {
        // Get current project data
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
            showMessage('Error loading project data', 'error');
            return;
        }
        
        const data = await response.json();
        const project = data.project;
        
        // Check permission
        if (!project.can_edit) {
            showMessage('You can only edit your own projects', 'error');
            return;
        }
        
        // Create and show edit modal
        const editModal = `
            <div class="modal show" id="edit-project-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Project</h2>
                        <button class="close-modal" onclick="closeEditProjectModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-project-form">
                            <div class="form-group">
                                <label for="edit-title">Project Title</label>
                                <input type="text" id="edit-title" value="${escapeHtml(project.title)}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-description">Description</label>
                                <textarea id="edit-description" rows="5" required>${escapeHtml(project.description)}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="edit-category">Category</label>
                                <select id="edit-category" required>
                                    <option value="Web Development" ${project.category === 'Web Development' ? 'selected' : ''}>Web Development</option>
                                    <option value="Mobile Apps" ${project.category === 'Mobile Apps' ? 'selected' : ''}>Mobile Apps</option>
                                    <option value="AI/ML" ${project.category === 'AI/ML' ? 'selected' : ''}>AI/ML</option>
                                    <option value="IoT" ${project.category === 'IoT' ? 'selected' : ''}>IoT</option>
                                    <option value="Game Development" ${project.category === 'Game Development' ? 'selected' : ''}>Game Development</option>
                                    <option value="Other" ${project.category === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-funding-goal">Funding Goal ($)</label>
                                <input type="number" id="edit-funding-goal" value="${project.funding_goal || 0}" min="0" step="0.01">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeEditProjectModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveProjectEdit(${projectId})">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', editModal);
        
    } catch (error) {
        console.error('Error setting up project edit:', error);
        showMessage('Error setting up project edit', 'error');
    }
}

async function saveProjectEdit(projectId) {
    try {
        const title = document.getElementById('edit-title').value.trim();
        const description = document.getElementById('edit-description').value.trim();
        const category = document.getElementById('edit-category').value;
        const fundingGoal = parseFloat(document.getElementById('edit-funding-goal').value) || 0;
        
        if (!title || !description || !category) {
            showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        if (description.split(' ').length < 50) {
            showMessage('Project description must be at least 50 words', 'error');
            return;
        }
        
        const saveBtn = document.querySelector('#edit-project-modal .btn-primary');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description,
                category: category,
                fundingGoal: fundingGoal
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Project updated successfully!', 'success');
            closeEditProjectModal();
            
            // Refresh the projects list
            currentPage = 1;
            loadProjects();
            
            // Update current project if modal is open
            if (currentProject && currentProject.id === projectId) {
                currentProject = data.project;
                displayProjectModal(currentProject);
            }
        } else {
            showMessage(data.error || 'Failed to update project', 'error');
        }
        
    } catch (error) {
        console.error('Network error:', error);
        showMessage('Network error while updating project', 'error');
    } finally {
        const saveBtn = document.querySelector('#edit-project-modal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
    }
}

function closeEditProjectModal() {
    const modal = document.getElementById('edit-project-modal');
    if (modal) {
        modal.remove();
    }
}

async function deleteProject(projectId) {
    if (!currentUser) {
        showMessage('Please login to delete projects', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone and will remove all associated comments and data.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Project deleted successfully!', 'success');
            
            // Close modal if current project was deleted
            if (currentProject && currentProject.id === projectId) {
                closeModals();
                currentProject = null;
            }
            
            // Refresh the projects list
            currentPage = 1;
            loadProjects();
            
        } else {
            showMessage(data.error || 'Failed to delete project', 'error');
        }
        
    } catch (error) {
        console.error('Network error:', error);
        showMessage('Network error while deleting project', 'error');
    }
}
