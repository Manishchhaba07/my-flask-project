// Discussion page JavaScript functionality

let currentUser = null;
let currentPage = 1;
let currentFilters = {
    search: '',
    category: '',
    sort: 'recent'
};
let currentDiscussion = null;
let isLoading = false;
let selectedMedia = null;
let mediaData = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDiscussionPage();
});

async function initializeDiscussionPage() {
    await checkAuthStatus();
    loadDiscussions();
    setupEventListeners();
}

function setupEventListeners() {
    // Discussion form submission
    const discussionForm = document.getElementById('discussion-form');
    if (discussionForm) {
        discussionForm.addEventListener('submit', handleDiscussionSubmit);
    }

    // Image upload handler
    const imageInput = document.getElementById('discussion-image');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }

    // Comment form submission
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentSubmit);
    }

    // Edit discussion form submission
    const editForm = document.getElementById('edit-discussion-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditDiscussionSubmit);
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchDiscussions();
            }
        });
    }

    // Modal close handlers
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('discussion-modal');
        const editModal = document.getElementById('edit-discussion-modal');
        
        if (event.target === modal) {
            closeDiscussionModal();
        }
        if (event.target === editModal) {
            closeEditModal();
        }
    });
}

// Toggle create discussion form
function toggleCreateForm() {
    const form = document.getElementById('discussion-form');
    const button = document.querySelector('.btn-create-toggle');
    
    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
        button.innerHTML = '<i class="fas fa-minus"></i> Cancel';
        button.classList.add('cancel');
    } else {
        form.style.display = 'none';
        button.innerHTML = '<i class="fas fa-plus"></i> Create Post';
        button.classList.remove('cancel');
        // Clear form
        form.reset();
        clearImagePreview();
    }
}

// Clear image preview
function clearImagePreview() {
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.remove();
    }
    selectedMedia = null;
    mediaData = null;
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showAuthenticatedUI();
        } else {
            showGuestUI();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showGuestUI();
    }
}

function showAuthenticatedUI() {
    const createSection = document.getElementById('create-discussion-section');
    const dashboardLink = document.getElementById('dashboard-link');
    const profileLink = document.getElementById('profile-link');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    
    if (createSection) createSection.style.display = 'block';
    if (dashboardLink) dashboardLink.style.display = 'inline-flex';
    if (profileLink) profileLink.style.display = 'inline-flex';
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    
    if (userMenu) {
        userMenu.style.display = 'inline-block';
        if (userName) {
            userName.textContent = currentUser.first_name || currentUser.username || 'User';
        }
    }
}

function showGuestUI() {
    const createSection = document.getElementById('create-discussion-section');
    const dashboardLink = document.getElementById('dashboard-link');
    
    if (createSection) createSection.style.display = 'none';
    if (dashboardLink) dashboardLink.style.display = 'none';
}



function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        mediaData = e.target.result;
        showImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showImagePreview(src) {
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('preview-img');
    
    if (preview && img) {
        img.src = src;
        preview.style.display = 'block';
    }
}

function removeImage() {
    const preview = document.getElementById('image-preview');
    const input = document.getElementById('discussion-image');
    
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
    mediaData = null;
}

function resetDiscussionForm() {
    const form = document.getElementById('discussion-form');
    if (form) {
        form.reset();
        removeImage();
    }
}

function cancelDiscussion() {
    toggleCreateForm();
}

async function handleDiscussionSubmit(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please log in to create a discussion.');
        return;
    }

    const submitBtn = document.getElementById('submit-discussion-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

    const formData = new FormData(event.target);
    
    // Convert FormData to JSON for easier handling
    const data = {
        title: formData.get('title'),
        content: formData.get('content'),
        category: formData.get('category'),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : []
    };
    
    // Add image data if present
    if (mediaData) {
        data.media_data = mediaData;
        data.media_type = 'image';
    }

    try {
        const response = await fetch('/api/discussions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Discussion created successfully!', 'success');
            resetDiscussionForm();
            toggleCreateForm();
            loadDiscussions(); // Refresh the discussions list
        } else {
            throw new Error(result.error || 'Failed to create discussion');
        }
    } catch (error) {
        console.error('Error creating discussion:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Discussion';
    }
}

async function loadDiscussions() {
    if (isLoading) return;
    
    isLoading = true;
    const discussionsList = document.getElementById('discussions-list');
    
    // Show loading state on first load
    if (currentPage === 1) {
        discussionsList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading discussions...</p>
            </div>
        `;
    }

    try {
        const params = new URLSearchParams({
            page: currentPage,
            search: currentFilters.search,
            category: currentFilters.category,
            sort: currentFilters.sort,
            has_more: true
        });

        const response = await fetch(`/api/discussions?${params}`);
        const data = await response.json();

        if (response.ok) {
            if (currentPage === 1) {
                discussionsList.innerHTML = '';
            }
            
            if (data.discussions.length === 0 && currentPage === 1) {
                showEmptyState();
            } else {
                renderDiscussions(data.discussions);
                updateLoadMoreButton(data.has_more);
            }
        } else {
            throw new Error(data.error || 'Failed to load discussions');
        }
    } catch (error) {
        console.error('Error loading discussions:', error);
        discussionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Discussions</h3>
                <p>Please try again later.</p>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

function renderDiscussions(discussions) {
    const discussionsList = document.getElementById('discussions-list');
    
    discussions.forEach(discussion => {
        const discussionCard = createDiscussionCard(discussion);
        discussionsList.appendChild(discussionCard);
    });
}

function createDiscussionCard(discussion) {
    const card = document.createElement('div');
    card.className = 'discussion-card';
    card.onclick = () => openDiscussionModal(discussion.id);

    const canEdit = currentUser && currentUser.id === discussion.author.id;
    const editOverlay = canEdit ? `
        <div class="discussion-edit-overlay">
            <button class="btn btn-secondary" onclick="event.stopPropagation(); editDiscussion(${discussion.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" onclick="event.stopPropagation(); deleteDiscussion(${discussion.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    ` : '';

    const imageSection = discussion.media_url ? `
        <div class="discussion-image">
            <img src="${discussion.media_url}" alt="Discussion image">
        </div>
    ` : '';

    const tagsSection = discussion.tags && discussion.tags.length > 0 ? `
        <div class="discussion-tags">
            ${discussion.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
    ` : '';

    card.innerHTML = `
        ${editOverlay}
        <div class="discussion-header-card">
            <div>
                <div class="discussion-title">${escapeHtml(discussion.title)}</div>
                <div class="discussion-meta">
                    <span class="discussion-category">${escapeHtml(discussion.category)}</span>
                    <span class="author-info">
                        <i class="fas fa-user"></i> ${escapeHtml(discussion.author.username)}
                    </span>
                    <span><i class="fas fa-clock"></i> ${formatDate(discussion.created_at)}</span>
                </div>
            </div>
        </div>
        
        <div class="discussion-content">
            ${escapeHtml(discussion.content).substring(0, 300)}${discussion.content.length > 300 ? '...' : ''}
        </div>
        
        ${imageSection}
        ${tagsSection}
        
        <div class="discussion-stats">
            <div class="discussion-actions">
                <button class="action-btn ${discussion.is_liked ? 'liked' : ''}" 
                        onclick="event.stopPropagation(); toggleDiscussionLike(${discussion.id})">
                    <i class="fas fa-heart"></i> ${discussion.like_count}
                </button>
                <button class="action-btn" onclick="event.stopPropagation(); openDiscussionModal(${discussion.id})">
                    <i class="fas fa-comment"></i> ${discussion.reply_count}
                </button>
                <button class="action-btn" onclick="event.stopPropagation(); shareDiscussion(${discussion.id})">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        </div>
    `;

    return card;
}

async function openDiscussionModal(discussionId) {
    const modal = document.getElementById('discussion-modal');
    const modalTitle = document.getElementById('modal-discussion-title');
    const discussionDetail = document.getElementById('discussion-detail');
    const commentsList = document.getElementById('comments-list');
    const addCommentBtn = document.getElementById('add-comment-btn');

    modal.style.display = 'block';
    
    // Show loading state
    discussionDetail.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';
    commentsList.innerHTML = '';

    try {
        const response = await fetch(`/api/discussions/${discussionId}`);
        const data = await response.json();

        if (response.ok) {
            currentDiscussion = data.discussion;
            modalTitle.textContent = data.discussion.title;
            
            renderDiscussionDetail(data.discussion);
            await loadComments(discussionId);
            
            if (currentUser) {
                addCommentBtn.style.display = 'block';
            }
        } else {
            throw new Error(data.error || 'Failed to load discussion');
        }
    } catch (error) {
        console.error('Error loading discussion:', error);
        discussionDetail.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Discussion</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

function renderDiscussionDetail(discussion) {
    const discussionDetail = document.getElementById('discussion-detail');
    
    const imageSection = discussion.media_url ? `
        <div class="discussion-image">
            <img src="${discussion.media_url}" alt="Discussion image">
        </div>
    ` : '';

    const tagsSection = discussion.tags && discussion.tags.length > 0 ? `
        <div class="discussion-tags">
            ${discussion.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
    ` : '';

    discussionDetail.innerHTML = `
        <div class="discussion-detail-header">
            <h2 class="discussion-detail-title">${escapeHtml(discussion.title)}</h2>
            <div class="discussion-detail-meta">
                <span class="discussion-category">${escapeHtml(discussion.category)}</span>
                <span class="author-info">
                    <i class="fas fa-user"></i> ${escapeHtml(discussion.author.username)}
                </span>
                <span><i class="fas fa-clock"></i> ${formatDate(discussion.created_at)}</span>
            </div>
        </div>
        
        <div class="discussion-detail-content">
            ${escapeHtml(discussion.content).replace(/\n/g, '<br>')}
        </div>
        
        ${imageSection}
        ${tagsSection}
        
        <div class="discussion-actions">
            <button class="action-btn ${discussion.is_liked ? 'liked' : ''}" 
                    onclick="toggleDiscussionLike(${discussion.id})">
                <i class="fas fa-heart"></i> ${discussion.like_count}
            </button>
            <button class="action-btn" onclick="shareDiscussion(${discussion.id})">
                <i class="fas fa-share"></i> Share
            </button>
        </div>
    `;
}

async function loadComments(discussionId) {
    const commentsList = document.getElementById('comments-list');
    
    try {
        const response = await fetch(`/api/discussions/${discussionId}/comments`);
        const data = await response.json();

        if (response.ok) {
            if (data.comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <h3>No Comments Yet</h3>
                        <p>Be the first to comment on this discussion!</p>
                    </div>
                `;
            } else {
                commentsList.innerHTML = '';
                data.comments.forEach(comment => {
                    const commentCard = createCommentCard(comment);
                    commentsList.appendChild(commentCard);
                });
            }
        } else {
            throw new Error(data.error || 'Failed to load comments');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Comments</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

function createCommentCard(comment) {
    const card = document.createElement('div');
    card.className = 'comment-card';
    card.dataset.commentId = comment.id;

    const canEdit = currentUser && currentUser.id === comment.author.id;
    const editOverlay = canEdit ? `
        <div class="comment-edit-overlay">
            <button class="edit-comment-btn" onclick="editComment(${comment.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-comment-btn" onclick="deleteComment(${comment.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    ` : '';

    card.innerHTML = `
        ${editOverlay}
        <div class="comment-header">
            <span class="comment-author">${escapeHtml(comment.author.username)}</span>
            <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <div class="comment-content" id="comment-content-${comment.id}">
            ${escapeHtml(comment.content).replace(/\n/g, '<br>')}
        </div>
        <div class="comment-actions-bar">
            <button class="comment-action-btn ${comment.user_reaction === 'like' ? 'liked' : ''}" 
                    onclick="toggleCommentReaction(${comment.id}, 'like')">
                <i class="fas fa-heart"></i> ${comment.like_count}
            </button>
            <button class="comment-action-btn" onclick="toggleReplyForm(${comment.id})">
                <i class="fas fa-reply"></i> Reply
            </button>
        </div>
        <div id="reply-form-${comment.id}" class="reply-form" style="display: none;">
            <textarea placeholder="Write a reply..." rows="2"></textarea>
            <div class="comment-actions">
                <button type="button" onclick="cancelReply(${comment.id})">Cancel</button>
                <button type="button" onclick="submitReply(${comment.id})">Reply</button>
            </div>
        </div>
        <div id="replies-${comment.id}" class="replies-container">
            <!-- Replies will be loaded here if any -->
        </div>
    `;

    return card;
}

function showCommentForm() {
    const form = document.getElementById('comment-form');
    const button = document.getElementById('add-comment-btn');
    
    form.style.display = 'block';
    button.style.display = 'none';
}

function cancelComment() {
    const form = document.getElementById('comment-form');
    const button = document.getElementById('add-comment-btn');
    const textarea = document.getElementById('comment-content');
    
    form.style.display = 'none';
    button.style.display = 'block';
    if (textarea) textarea.value = '';
}

async function handleCommentSubmit(event) {
    event.preventDefault();
    
    if (!currentUser || !currentDiscussion) {
        alert('Please log in to comment.');
        return;
    }

    const textarea = document.getElementById('comment-content');
    const content = textarea.value.trim();
    
    if (!content) {
        alert('Please enter a comment.');
        return;
    }

    try {
        const response = await fetch(`/api/discussions/${currentDiscussion.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Comment posted successfully!', 'success');
            cancelComment();
            await loadComments(currentDiscussion.id);
        } else {
            throw new Error(result.error || 'Failed to post comment');
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        showNotification(error.message, 'error');
    }
}

async function toggleDiscussionLike(discussionId) {
    if (!currentUser) {
        alert('Please log in to like discussions.');
        return;
    }

    try {
        const response = await fetch(`/api/discussions/${discussionId}/like`, {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok) {
            // Update UI
            const actionBtns = document.querySelectorAll(`[onclick*="toggleDiscussionLike(${discussionId})"]`);
            actionBtns.forEach(btn => {
                const icon = btn.querySelector('i');
                if (result.liked) {
                    btn.classList.add('liked');
                    btn.innerHTML = `<i class="fas fa-heart"></i> ${result.like_count}`;
                } else {
                    btn.classList.remove('liked');
                    btn.innerHTML = `<i class="fas fa-heart"></i> ${result.like_count}`;
                }
            });
        } else {
            throw new Error(result.error || 'Failed to toggle like');
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showNotification(error.message, 'error');
    }
}

async function toggleCommentReaction(commentId, reactionType) {
    if (!currentUser) {
        alert('Please log in to react to comments.');
        return;
    }

    try {
        const response = await fetch(`/api/discussion-comments/${commentId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reaction_type: reactionType })
        });

        const result = await response.json();

        if (response.ok) {
            // Update UI
            const actionBtn = document.querySelector(`[onclick*="toggleCommentReaction(${commentId}, '${reactionType}')"]`);
            if (actionBtn) {
                if (result.reacted) {
                    actionBtn.classList.add('liked');
                } else {
                    actionBtn.classList.remove('liked');
                }
                actionBtn.innerHTML = `<i class="fas fa-heart"></i> ${result.reaction_count}`;
            }
        } else {
            throw new Error(result.error || 'Failed to toggle reaction');
        }
    } catch (error) {
        console.error('Error toggling reaction:', error);
        showNotification(error.message, 'error');
    }
}

function toggleReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
}

function cancelReply(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.style.display = 'none';
        const textarea = form.querySelector('textarea');
        if (textarea) textarea.value = '';
    }
}

async function submitReply(commentId) {
    if (!currentUser) {
        alert('Please log in to reply.');
        return;
    }

    const form = document.getElementById(`reply-form-${commentId}`);
    const textarea = form.querySelector('textarea');
    const content = textarea.value.trim();
    
    if (!content) {
        alert('Please enter a reply.');
        return;
    }

    try {
        const response = await fetch(`/api/discussion-comments/${commentId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Reply posted successfully!', 'success');
            cancelReply(commentId);
            // Reload comments to show the new reply
            await loadComments(currentDiscussion.id);
        } else {
            throw new Error(result.error || 'Failed to post reply');
        }
    } catch (error) {
        console.error('Error posting reply:', error);
        showNotification(error.message, 'error');
    }
}

async function editDiscussion(discussionId) {
    try {
        const response = await fetch(`/api/discussions/${discussionId}`);
        const data = await response.json();

        if (response.ok) {
            const discussion = data.discussion;
            
            // Populate edit form
            document.getElementById('edit-title').value = discussion.title;
            document.getElementById('edit-category').value = discussion.category;
            document.getElementById('edit-content').value = discussion.content;
            document.getElementById('edit-tags').value = discussion.tags ? discussion.tags.join(', ') : '';
            
            // Store discussion ID for form submission
            document.getElementById('edit-discussion-form').dataset.discussionId = discussionId;
            
            // Show modal
            document.getElementById('edit-discussion-modal').style.display = 'block';
        } else {
            throw new Error(data.error || 'Failed to load discussion for editing');
        }
    } catch (error) {
        console.error('Error loading discussion for edit:', error);
        showNotification(error.message, 'error');
    }
}

async function handleEditDiscussionSubmit(event) {
    event.preventDefault();
    
    const discussionId = event.target.dataset.discussionId;
    if (!discussionId) return;

    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        category: formData.get('category'),
        content: formData.get('content'),
        tags: formData.get('tags')
    };

    try {
        const response = await fetch(`/api/discussions/${discussionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Discussion updated successfully!', 'success');
            closeEditModal();
            loadDiscussions(); // Refresh discussions list
            
            // If modal is open, refresh it too
            if (currentDiscussion && currentDiscussion.id == discussionId) {
                openDiscussionModal(discussionId);
            }
        } else {
            throw new Error(result.error || 'Failed to update discussion');
        }
    } catch (error) {
        console.error('Error updating discussion:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteDiscussion(discussionId) {
    if (!confirm('Are you sure you want to delete this discussion? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/discussions/${discussionId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Discussion deleted successfully!', 'success');
            loadDiscussions(); // Refresh discussions list
            
            // Close modal if it's open
            if (currentDiscussion && currentDiscussion.id == discussionId) {
                closeDiscussionModal();
            }
        } else {
            throw new Error(result.error || 'Failed to delete discussion');
        }
    } catch (error) {
        console.error('Error deleting discussion:', error);
        showNotification(error.message, 'error');
    }
}

async function editComment(commentId) {
    const commentCard = document.querySelector(`[data-comment-id="${commentId}"]`);
    const contentDiv = document.getElementById(`comment-content-${commentId}`);
    const originalContent = contentDiv.textContent.trim();
    
    // Replace content with textarea
    contentDiv.innerHTML = `
        <textarea id="edit-textarea-${commentId}" rows="3" style="width: 100%; margin-bottom: 1rem;">${originalContent}</textarea>
        <div class="comment-actions">
            <button type="button" onclick="cancelEditComment(${commentId}, '${escapeHtml(originalContent)}')">Cancel</button>
            <button type="button" onclick="saveEditComment(${commentId})">Save</button>
        </div>
    `;
}

function cancelEditComment(commentId, originalContent) {
    const contentDiv = document.getElementById(`comment-content-${commentId}`);
    contentDiv.innerHTML = originalContent.replace(/\n/g, '<br>');
}

async function saveEditComment(commentId) {
    const textarea = document.getElementById(`edit-textarea-${commentId}`);
    const newContent = textarea.value.trim();
    
    if (!newContent) {
        alert('Comment cannot be empty.');
        return;
    }

    try {
        const response = await fetch(`/api/discussion-comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: newContent })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Comment updated successfully!', 'success');
            const contentDiv = document.getElementById(`comment-content-${commentId}`);
            contentDiv.innerHTML = escapeHtml(newContent).replace(/\n/g, '<br>');
        } else {
            throw new Error(result.error || 'Failed to update comment');
        }
    } catch (error) {
        console.error('Error updating comment:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }

    try {
        const response = await fetch(`/api/discussion-comments/${commentId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Comment deleted successfully!', 'success');
            await loadComments(currentDiscussion.id);
        } else {
            throw new Error(result.error || 'Failed to delete comment');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showNotification(error.message, 'error');
    }
}

function searchDiscussions() {
    const searchInput = document.getElementById('search-input');
    currentFilters.search = searchInput.value.trim();
    currentPage = 1;
    loadDiscussions();
}

function filterDiscussions() {
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    currentFilters.category = categoryFilter.value;
    currentFilters.sort = sortFilter.value;
    currentPage = 1;
    loadDiscussions();
}

function loadMoreDiscussions() {
    currentPage++;
    loadDiscussions();
}

function updateLoadMoreButton(hasMore) {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = hasMore ? 'block' : 'none';
    }
}

function shareDiscussion(discussionId) {
    const url = `${window.location.origin}/discussion.html?id=${discussionId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this discussion',
            url: url
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Link copied to clipboard!', 'success');
        });
    }
}

function closeDiscussionModal() {
    const modal = document.getElementById('discussion-modal');
    modal.style.display = 'none';
    currentDiscussion = null;
    
    // Reset comment form
    cancelComment();
}

function closeEditModal() {
    const modal = document.getElementById('edit-discussion-modal');
    modal.style.display = 'none';
    
    // Reset form
    const form = document.getElementById('edit-discussion-form');
    form.reset();
    delete form.dataset.discussionId;
}

function showEmptyState() {
    const discussionsList = document.getElementById('discussions-list');
    discussionsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <h3>No Discussions Found</h3>
            <p>Be the first to start a discussion in the community!</p>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
        return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('Logged out successfully!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('Error logging out:', error);
    }
}