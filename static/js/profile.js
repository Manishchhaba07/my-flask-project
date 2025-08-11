// Profile page JavaScript functionality

let currentUser = null;
let viewingUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if viewing another user's profile
    const urlParams = new URLSearchParams(window.location.search);
    viewingUserId = urlParams.get('user_id');
    
    // First verify authentication for any profile access
    checkAuthStatus().then(() => {
        if (viewingUserId) {
            // Load other user's profile
            loadOtherUserProfile(viewingUserId);
        } else {
            // Load own profile data
            loadProfileData();
        }
        
        // Setup modals (only for own profile)
        if (!viewingUserId) {
            setupModals();
            setupProfileImage();
        }
        
        // Setup search functionality
        setupSearchFunction();
        
        // Load all sections
        loadAllSections();
        
        // Start real-time updates
        startRealTimeUpdates();
    });
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            // Only update profile info if we're not viewing another user's profile
            if (!viewingUserId) {
                updateProfileInfo();
            }
            return true;
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

async function loadOtherUserProfile(userId) {
    console.log('Loading profile for user ID:', userId);
    try {
        const response = await fetch(`/api/users/${userId}/profile`);
        console.log('API response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Profile data received:', data);
            
            currentUser = data.profile;
            updateProfileInfo();
            updateProfileStats(data.profile);
            displayUserProjects(data.profile.projects || []);
            
            // Hide edit button for other users' profiles
            const editBtn = document.getElementById('edit-profile-btn');
            if (editBtn) editBtn.style.display = 'none';
            
            // Hide profile image overlay for other users
            const overlay = document.getElementById('profile-image-overlay');
            if (overlay) overlay.style.display = 'none';
            
            // Update page title to show whose profile this is
            document.title = `${data.profile.full_name}'s Profile | CollabFund`;
            
            // Show a banner indicating viewing another user's profile
            showViewingOtherProfileBanner(data.profile.full_name);
            
        } else {
            const errorText = await response.text();
            console.error('Failed to load user profile:', response.status, errorText);
            showMessage('User profile not found', 'error');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showMessage('Error loading user profile', 'error');
    }
}

function showViewingOtherProfileBanner(userName) {
    const existingBanner = document.querySelector('.viewing-other-profile-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    const banner = document.createElement('div');
    banner.className = 'viewing-other-profile-banner';
    banner.innerHTML = `
        <div class="banner-content">
            <i class="fas fa-eye"></i>
            <span>Viewing ${userName}'s Profile</span>
            <a href="profile.html" class="btn-secondary btn-small">
                <i class="fas fa-user"></i> My Profile
            </a>
        </div>
    `;
    
    const main = document.querySelector('.profile-main');
    if (main) {
        main.insertBefore(banner, main.firstChild);
    }
}

function updateProfileInfo(profileData = null) {
    const user = profileData || currentUser;
    if (!user) return;
    
    // Update sidebar profile info
    document.getElementById('profile-name').textContent = user.full_name || 'Nave Name';
    
    // Update title/role
    const titleElement = document.getElementById('profile-title');
    if (user.title) {
        titleElement.textContent = user.title;
    } else {
        titleElement.textContent = 'Your Softation';
    }
    
    // Update contact item links with actual data when available
    updateContactItems(user);
    
    // Update profile image
    const profileImage = document.getElementById('profile-image');
    const defaultAvatar = document.getElementById('default-avatar');
    if (user.profile_image) {
        profileImage.src = user.profile_image;
        profileImage.style.display = 'block';
        defaultAvatar.style.display = 'none';
    } else {
        profileImage.style.display = 'none';
        defaultAvatar.style.display = 'flex';
    }
}

function updateContactItems(user) {
    // Update bio in about section
    const bioElement = document.getElementById('profile-bio');
    if (user.bio && user.bio.trim() !== '') {
        bioElement.textContent = user.bio;
    } else {
        bioElement.textContent = 'Student developer passionate about creating innovative solutions.';
    }
    
    // Update LinkedIn
    const linkedinItem = document.querySelector('.contact-item:nth-child(1)');
    if (linkedinItem && user.linkedin) {
        linkedinItem.style.cursor = 'pointer';
        linkedinItem.onclick = () => window.open(user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`, '_blank');
    }
    
    // Update Phone
    const phoneItem = document.querySelector('.contact-item:nth-child(2) span');
    if (phoneItem) {
        phoneItem.textContent = user.phone || 'Phone';
    }
    
    // Update Location
    const locationItem = document.querySelector('.contact-item:nth-child(3) span');
    if (locationItem) {
        locationItem.textContent = user.location || 'Location';
    }
    
    // Update GitHub
    const githubItem = document.querySelector('.contact-item:nth-child(4)');
    if (githubItem && user.github) {
        githubItem.style.cursor = 'pointer';
        githubItem.onclick = () => window.open(user.github.startsWith('http') ? user.github : `https://github.com/${user.github}`, '_blank');
    }
    
    // Update Twitter
    const twitterItem = document.querySelector('.contact-item:nth-child(5)');
    if (twitterItem && user.twitter) {
        twitterItem.style.cursor = 'pointer';
        twitterItem.onclick = () => window.open(user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter.replace('@', '')}`, '_blank');
    }
}

function updateSocialLinks(user) {
    // Update Twitter link
    const twitterLink = document.getElementById('twitter-link');
    if (user.twitter) {
        twitterLink.href = user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter.replace('@', '')}`;
        twitterLink.style.display = 'flex';
    } else {
        twitterLink.style.display = 'none';
    }
    
    // Update LinkedIn link
    const linkedinLink = document.getElementById('linkedin-link');
    if (user.linkedin) {
        linkedinLink.href = user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`;
        linkedinLink.style.display = 'flex';
    } else {
        linkedinLink.style.display = 'none';
    }
    
    // Update GitHub link
    const githubLink = document.getElementById('github-link');
    if (user.github) {
        githubLink.href = user.github.startsWith('http') ? user.github : `https://github.com/${user.github}`;
        githubLink.style.display = 'flex';
    } else {
        githubLink.style.display = 'none';
    }
}

function updateProfileStats(stats) {
    document.getElementById('user-projects-count').textContent = stats.total_projects || 0;
    document.getElementById('user-collaborations').textContent = stats.total_collaborations || 0;
    document.getElementById('user-funding').textContent = `$${(stats.total_funding || 0).toFixed(2)}`;
    document.getElementById('user-votes').textContent = stats.total_votes || 0;
}

async function loadProfileData() {
    try {
        // Load user statistics
        await loadUserStats();
        
        // Load user projects
        await loadUserProjects();
        
        // Load collaborations
        await loadUserCollaborations();
        
        // Load donations
        await loadUserDonations();
        
        // Load activity
        await loadUserActivity();
        
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

async function loadUserStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('user-projects').textContent = data.total_projects || 0;
            document.getElementById('user-collaborations').textContent = data.total_collaborations || 0;
            document.getElementById('user-funding').textContent = `$${(data.total_funding || 0).toFixed(2)}`;
            document.getElementById('user-votes').textContent = data.total_votes || 0;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadUserProjects() {
    const projectsGrid = document.getElementById('user-projects-grid');
    const emptyState = document.querySelector('#projects-section .empty-state');
    if (!projectsGrid || !emptyState) return;
    
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            const projects = data.projects || [];
            
            if (projects.length > 0) {
                emptyState.style.display = 'none';
                projectsGrid.style.display = 'grid';
                displayUserProjects(projects);
            } else {
                emptyState.style.display = 'flex';
                projectsGrid.style.display = 'none';
            }
        } else {
            emptyState.style.display = 'flex';
            projectsGrid.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading user projects:', error);
        emptyState.style.display = 'flex';
        projectsGrid.style.display = 'none';
    }
}

function displayUserProjects(projects) {
    const projectsGrid = document.getElementById('user-projects-grid');
    if (!projectsGrid) return;
    
    if (projects.length === 0) {
        projectsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-rocket"></i>
                <h3>No Projects Yet</h3>
                <p>Create your first project to get started!</p>
                <button class="btn-primary" onclick="window.location.href='dashboard.html'">
                    <i class="fas fa-plus"></i> Create Project
                </button>
            </div>
        `;
        return;
    }
    
    // Sample project data with images and tech stacks for demonstration
    const sampleProjects = [
        {
            id: 1,
            title: "Project",
            description: "Velit qui anim id excepturi amet quis and placerat ante.",
            category: "React",
            tech: "React",
            badge: "Beta",
            image: null,
            gradient: "linear-gradient(135deg, #667eea, #764ba2)"
        },
        {
            id: 2,
            title: "Saven",
            description: "Velit qui anim sed esse consectetur enim and laborum et dolore magna.",
            category: "React",  
            tech: "Python",
            badge: "Rust",
            image: null,
            gradient: "linear-gradient(135deg, #f093fb, #f5576c)"
        },
        {
            id: 3,
            title: "Clomtpotion",
            description: "Velit qui nisi sed consectetur enim and laborum et dolore magna.",
            category: "Python",
            tech: "Heltiq",
            badge: "AWS",
            image: null,
            gradient: "linear-gradient(135deg, #4facfe, #00f2fe)"
        },
        {
            id: 4,
            title: "Python", 
            description: "Carry text and consectetur enim and laborum et magna consequat.",
            category: "Programming",
            tech: "NumPy",
            badge: "Beta",
            image: null,
            gradient: "linear-gradient(135deg, #43e97b, #38f9d7)"
        },
        {
            id: 5,
            title: "Python",
            description: "Carry text eur mollit enim and laborum et dolore magna consequat.",
            category: "Data Science",
            tech: "Python",
            badge: "Beta",
            image: null,
            gradient: "linear-gradient(135deg, #fa709a, #fee140)"
        },
        {
            id: 6,
            title: "Soovuts",
            description: "Velit qui anim eum esse consectetur enim and laborum et magna consequat.",
            category: "Web Development",
            tech: "Django",
            badge: "AWS",
            image: null,
            gradient: "linear-gradient(135deg, #a8edea, #fed6e3)"
        },
        {
            id: 7,
            title: "Pood rons",
            description: "Velit qui anim in pariatur cillum mollit and magna consequat dolore.",
            category: "Mobile",
            tech: "Flutter",
            badge: "Beta",
            image: null,
            gradient: "linear-gradient(135deg, #ff9a9e, #fecfef)"
        },
        {
            id: 8,
            title: "Varion",
            description: "Carry test sunt anim dolore cillum and laborum et magna consequat.", 
            category: "AI/ML",
            tech: "Python",
            badge: "Beta",
            image: null,
            gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)"
        },
        {
            id: 9,
            title: "Licediains",
            description: "Velit qui anim dolore consequat et and laborum et magna consequat.",
            category: "Blockchain",
            tech: "Remix",
            badge: "Beta",
            image: null,
            gradient: "linear-gradient(135deg, #ffecd2, #fcb69f)"
        }
    ];
    
    // Use sample projects for demonstration, but in real implementation use actual projects
    const displayProjects = projects.length > 0 ? projects : sampleProjects;
    
    projectsGrid.innerHTML = displayProjects.map((project, index) => {
        const sampleProject = sampleProjects[index % sampleProjects.length];
        return `
            <div class="project-card" onclick="viewProject(${project.id || sampleProject.id})">
                <div class="project-info">
                    <div class="project-badge">${sampleProject.badge}</div>
                    <h3 class="project-title">${escapeHtml(project.title || sampleProject.title)}</h3>
                    <div class="project-category">${escapeHtml(project.category || sampleProject.category)}</div>
                    <div class="project-actions">
                        <button class="action-btn btn-view" onclick="event.stopPropagation(); viewProject(${project.id || sampleProject.id})">View Project</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getProjectImage(project, sampleProject) {
    // Check if project has image attachments
    if (project.attachments && project.attachments.length > 0) {
        const imageAttachment = project.attachments.find(att => 
            att.file_type && att.file_type.startsWith('image/')
        );
        if (imageAttachment) {
            return `url('/static/${imageAttachment.file_path}') center/cover`;
        }
    }
    return sampleProject.gradient;
}

function getProjectImageElement(project, sampleProject) {
    // Check if project has image attachments
    if (project.attachments && project.attachments.length > 0) {
        const imageAttachment = project.attachments.find(att => 
            att.file_type && att.file_type.startsWith('image/')
        );
        if (imageAttachment) {
            return `<img src="/static/${imageAttachment.file_path}" alt="${escapeHtml(project.title || sampleProject.title)}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
    }
    return sampleProject.image ? `<img src="${sampleProject.image}" alt="${escapeHtml(project.title || sampleProject.title)}">` : '';
}

function viewProject(projectId) {
    // Navigate to browse dashboard to view project details
    window.location.href = `/browse.html?project=${projectId}`;
}

// Load collaborations for the collaboration tab
function loadUserCollaborations() {
    const collaborationsList = document.getElementById('user-collaborations-list');
    if (!collaborationsList) return;
    
    // Sample collaboration data
    const collaborations = [
        {
            id: 1,
            project_title: "EcoTrack App",
            role: "Frontend Developer",
            status: "Active",
            owner: "Sarah Johnson",
            created_date: "2024-02-15"
        },
        {
            id: 2,
            project_title: "Smart Campus System",
            role: "Backend Developer", 
            status: "Completed",
            owner: "Mike Chen",
            created_date: "2024-01-20"
        },
        {
            id: 3,
            project_title: "Study Buddy Platform",
            role: "UI/UX Designer",
            status: "Active",
            owner: "Lisa Williams",
            created_date: "2024-03-01"
        }
    ];
    
    if (collaborations.length === 0) {
        collaborationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-handshake"></i>
                <h3>No Collaborations Yet</h3>
                <p>Start collaborating on projects to see them here!</p>
            </div>
        `;
        return;
    }
    
    collaborationsList.innerHTML = `
        <div class="collaborations-grid">
            ${collaborations.map(collab => `
                <div class="collaboration-card">
                    <div class="collaboration-header">
                        <h3>${escapeHtml(collab.project_title)}</h3>
                        <span class="status-badge ${collab.status.toLowerCase()}">${collab.status}</span>
                    </div>
                    <div class="collaboration-details">
                        <p><strong>Role:</strong> ${escapeHtml(collab.role)}</p>
                        <p><strong>Project Owner:</strong> ${escapeHtml(collab.owner)}</p>
                        <p><strong>Started:</strong> ${new Date(collab.created_date).toLocaleDateString()}</p>
                    </div>
                    <div class="collaboration-actions">
                        <button class="action-btn btn-view" onclick="viewProject(${collab.id})">View Project</button>
                        <button class="action-btn btn-github">Contact Owner</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Load donations for the donation tab
function loadUserDonations() {
    const donationsList = document.getElementById('user-donations-list');
    if (!donationsList) return;
    
    // Sample donation data
    const donations = [
        {
            id: 1,
            project_title: "Clean Water Initiative",
            amount: 50.00,
            date: "2024-03-10",
            status: "Completed"
        },
        {
            id: 2,
            project_title: "Student Learning App",
            amount: 25.00,
            date: "2024-03-05",
            status: "Completed"
        },
        {
            id: 3,
            project_title: "Community Garden Project",
            amount: 75.00,
            date: "2024-02-28",
            status: "Completed"
        }
    ];
    
    if (donations.length === 0) {
        donationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-donate"></i>
                <h3>No Donations Yet</h3>
                <p>Support projects you believe in to see your donation history here!</p>
            </div>
        `;
        return;
    }
    
    donationsList.innerHTML = `
        <div class="donations-grid">
            ${donations.map(donation => `
                <div class="donation-card">
                    <div class="donation-header">
                        <h3>${escapeHtml(donation.project_title)}</h3>
                        <span class="amount">$${donation.amount.toFixed(2)}</span>
                    </div>
                    <div class="donation-details">
                        <p><strong>Date:</strong> ${new Date(donation.date).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> ${donation.status}</p>
                    </div>
                    <div class="donation-actions">
                        <button class="action-btn btn-view" onclick="viewProject(${donation.id})">View Project</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Load activity history for the history tab
function loadUserActivity() {
    const activityFeed = document.getElementById('user-activity-feed');
    if (!activityFeed) return;
    
    // Sample activity data
    const activities = [
        {
            id: 1,
            type: "project_created",
            description: "Created a new project 'AI Study Assistant'",
            date: "2024-03-15",
            icon: "fa-rocket"
        },
        {
            id: 2,
            type: "collaboration",
            description: "Joined collaboration on 'EcoTrack App'",
            date: "2024-03-10",
            icon: "fa-handshake"
        },
        {
            id: 3,
            type: "donation",
            description: "Donated $50 to 'Clean Water Initiative'",
            date: "2024-03-10",
            icon: "fa-donate"
        },
        {
            id: 4,
            type: "vote",
            description: "Voted for 'Smart Campus System'",
            date: "2024-03-08",
            icon: "fa-thumbs-up"
        },
        {
            id: 5,
            type: "comment",
            description: "Commented on 'Student Learning App'",
            date: "2024-03-05",
            icon: "fa-comment"
        }
    ];
    
    if (activities.length === 0) {
        activityFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No Activity Yet</h3>
                <p>Your activity history will appear here as you use the platform!</p>
            </div>
        `;
        return;
    }
    
    activityFeed.innerHTML = `
        <div class="activity-timeline">
            ${activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${escapeHtml(activity.description)}</p>
                        <span class="activity-date">${new Date(activity.date).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadUserCollaborations() {
    const collaborationsList = document.getElementById('user-collaborations-list');
    const emptyState = document.querySelector('#collaboration-section .empty-state');
    if (!collaborationsList || !emptyState) return;
    
    try {
        const response = await fetch('/api/dashboard/user-collaborations');
        if (response.ok) {
            const data = await response.json();
            const collaborations = data.collaborations || [];
            
            if (collaborations.length > 0) {
                emptyState.style.display = 'none';
                collaborationsList.style.display = 'grid';
                displayUserCollaborations(collaborations);
            } else {
                emptyState.style.display = 'flex';
                collaborationsList.style.display = 'none';
            }
        } else {
            emptyState.style.display = 'flex';
            collaborationsList.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading collaborations:', error);
        emptyState.style.display = 'flex';
        collaborationsList.style.display = 'none';
    }
}

function displayUserCollaborations(collaborations) {
    const collaborationsList = document.getElementById('user-collaborations-list');
    if (!collaborationsList) return;
    
    if (collaborations.length === 0) {
        collaborationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-handshake"></i>
                <h3>No Collaborations Yet</h3>
                <p>Start collaborating with other students on their projects!</p>
                <button class="btn-primary" onclick="window.location.href='browse.html'">
                    <i class="fas fa-search"></i> Browse Projects
                </button>
            </div>
        `;
        return;
    }
    
    collaborationsList.innerHTML = collaborations.map(collab => `
        <div class="list-item">
            <div class="list-item-header">
                <span class="list-item-title">${escapeHtml(collab.project_title)}</span>
                <span class="collaboration-status ${collab.status}">${collab.status}</span>
            </div>
            <div class="list-item-content">
                <p><strong>Project Owner:</strong> ${escapeHtml(collab.owner_name)}</p>
                ${collab.message ? `<p><strong>Message:</strong> ${escapeHtml(collab.message)}</p>` : ''}
                <span class="list-item-date" data-timestamp="${collab.created_at}">${formatDate(collab.created_at)}</span>
            </div>
        </div>
    `).join('');
}

async function loadUserDonations() {
    const donationsList = document.getElementById('user-donations-list');
    const emptyState = document.querySelector('#donation-section .empty-state');
    if (!donationsList || !emptyState) return;
    
    try {
        const response = await fetch('/api/dashboard/user-donations');
        if (response.ok) {
            const data = await response.json();
            const donations = data.donations || [];
            
            if (donations.length > 0) {
                emptyState.style.display = 'none';
                donationsList.style.display = 'grid';
                displayUserDonations(donations);
            } else {
                emptyState.style.display = 'flex';
                donationsList.style.display = 'none';
            }
        } else {
            emptyState.style.display = 'flex';
            donationsList.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading donations:', error);
        emptyState.style.display = 'flex';
        donationsList.style.display = 'none';
    }
}

function displayUserDonations(donations) {
    const donationsList = document.getElementById('user-donations-list');
    if (!donationsList) return;
    
    if (donations.length === 0) {
        donationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-donate"></i>
                <h3>No Donations Yet</h3>
                <p>Support amazing student projects by making your first donation!</p>
                <button class="btn-primary" onclick="window.location.href='browse.html'">
                    <i class="fas fa-search"></i> Browse Projects
                </button>
            </div>
        `;
        return;
    }
    
    donationsList.innerHTML = donations.map(donation => `
        <div class="list-item">
            <div class="list-item-header">
                <span class="list-item-title">${escapeHtml(donation.project_title)}</span>
                <span class="donation-amount">$${donation.amount.toFixed(2)}</span>
            </div>
            <div class="list-item-content">
                <p><strong>Project Owner:</strong> ${escapeHtml(donation.owner_name)}</p>
                ${donation.message ? `<p><strong>Message:</strong> ${escapeHtml(donation.message)}</p>` : ''}
                <span class="list-item-date" data-timestamp="${donation.created_at}">${formatDate(donation.created_at)}</span>
            </div>
        </div>
    `).join('');
}

async function loadUserActivity() {
    const activityFeed = document.getElementById('user-activity-feed');
    const emptyState = document.querySelector('#history-section .empty-state');
    if (!activityFeed || !emptyState) return;
    
    try {
        const response = await fetch('/api/dashboard/user-activity');
        if (response.ok) {
            const data = await response.json();
            const activities = data.activities || [];
            
            if (activities.length > 0) {
                emptyState.style.display = 'none';
                activityFeed.style.display = 'flex';
                displayUserActivity(activities);
            } else {
                emptyState.style.display = 'flex';
                activityFeed.style.display = 'none';
            }
        } else {
            emptyState.style.display = 'flex';
            activityFeed.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading activity:', error);
        emptyState.style.display = 'flex';
        activityFeed.style.display = 'none';
    }
}

function displayUserActivity(activities) {
    const activityFeed = document.getElementById('user-activity-feed');
    if (!activityFeed) return;
    
    if (activities.length === 0) {
        activityFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No Activity Yet</h3>
                <p>Start creating projects, collaborating, and engaging with the community!</p>
            </div>
        `;
        return;
    }
    
    activityFeed.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time" data-timestamp="${activity.time}">${formatDate(activity.time)}</div>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        'project_created': 'fa-rocket',
        'collaboration': 'fa-handshake',
        'donation': 'fa-donate',
        'vote': 'fa-thumbs-up',
        'comment': 'fa-comment'
    };
    return icons[type] || 'fa-circle';
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Update content header title based on tab
            const contentHeader = document.querySelector('.content-header h2');
            if (contentHeader) {
                switch(targetTab) {
                    case 'projects':
                        contentHeader.textContent = 'Projects';
                        break;
                    case 'collaboration':
                        contentHeader.textContent = 'Collaboration';
                        break;
                    case 'donation':
                        contentHeader.textContent = 'Donation';
                        break;
                    case 'history':
                        contentHeader.textContent = 'History';
                        break;
                    default:
                        contentHeader.textContent = this.textContent;
                }
            }
            
            // Clear any existing search notifications
            const existingNotification = document.querySelector('.search-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // Update search placeholder for the new tab
            updateSearchPlaceholder();
            
            // Load data for the selected tab - only load if content is empty
            switch(targetTab) {
                case 'projects':
                    const projectsGrid = document.getElementById('user-projects-grid');
                    if (!projectsGrid || projectsGrid.children.length === 0) {
                        loadUserProjects();
                    }
                    break;
                case 'collaboration':
                    const collaborationsList = document.getElementById('user-collaborations-list');
                    if (!collaborationsList || collaborationsList.children.length === 0) {
                        loadUserCollaborations();
                    }
                    break;
                case 'donation':
                    const donationsList = document.getElementById('user-donations-list');
                    if (!donationsList || donationsList.children.length === 0) {
                        loadUserDonations();
                    }
                    break;
                case 'history':
                    const activityFeed = document.getElementById('user-activity-feed');
                    if (!activityFeed || activityFeed.children.length === 0) {
                        loadUserActivity();
                    }
                    break;
            }
        });
    });
}

function setupModals() {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', openEditProfileModal);
    }
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleSaveProfile);
    }
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

function setupProfileImage() {
    const profileAvatar = document.getElementById('profile-avatar-container');
    const imageInput = document.getElementById('profile-image-input');
    const removeImageBtn = document.getElementById('remove-image-btn');
    
    if (profileAvatar && !viewingUserId) {
        profileAvatar.addEventListener('click', () => {
            if (imageInput) imageInput.click();
        });
    }
    
    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelect);
    }
    
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', handleImageRemove);
    }
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        // Update preview in modal
        const previewImg = document.getElementById('edit-preview-img');
        const defaultPreview = document.getElementById('edit-default-preview');
        const removeBtn = document.getElementById('remove-image-btn');
        
        if (previewImg && defaultPreview && removeBtn) {
            previewImg.src = base64Image;
            previewImg.style.display = 'block';
            defaultPreview.style.display = 'none';
            removeBtn.style.display = 'inline-flex';
        }
        
        // Store the base64 image for saving
        document.getElementById('edit-image-preview').dataset.imageData = base64Image;
    };
    reader.readAsDataURL(file);
}

function handleImageRemove() {
    const previewImg = document.getElementById('edit-preview-img');
    const defaultPreview = document.getElementById('edit-default-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    const imageInput = document.getElementById('profile-image-input');
    
    if (previewImg && defaultPreview && removeBtn && imageInput) {
        previewImg.style.display = 'none';
        previewImg.src = '';
        defaultPreview.style.display = 'flex';
        removeBtn.style.display = 'none';
        imageInput.value = '';
        
        // Mark for removal
        document.getElementById('edit-image-preview').dataset.imageData = 'REMOVE';
    }
}

function openEditProfileModal() {
    if (!currentUser) return;
    
    // Pre-fill form with current user data
    document.getElementById('edit-full-name').value = currentUser.full_name || '';
    document.getElementById('edit-email').value = currentUser.email || '';
    document.getElementById('edit-college').value = currentUser.college || '';
    document.getElementById('edit-bio').value = currentUser.bio || '';
    document.getElementById('edit-skills').value = currentUser.skills || '';
    document.getElementById('edit-phone').value = currentUser.phone || '';
    document.getElementById('edit-location').value = currentUser.location || '';
    document.getElementById('edit-title').value = currentUser.title || '';
    document.getElementById('edit-twitter').value = currentUser.twitter || '';
    document.getElementById('edit-linkedin').value = currentUser.linkedin || '';
    document.getElementById('edit-github').value = currentUser.github || '';
    
    // Set up image preview
    const previewImg = document.getElementById('edit-preview-img');
    const defaultPreview = document.getElementById('edit-default-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    
    if (currentUser.profile_image) {
        previewImg.src = currentUser.profile_image;
        previewImg.style.display = 'block';
        defaultPreview.style.display = 'none';
        removeBtn.style.display = 'inline-flex';
    } else {
        previewImg.style.display = 'none';
        defaultPreview.style.display = 'flex';
        removeBtn.style.display = 'none';
    }
    
    const modal = document.getElementById('edit-profile-modal');
    modal.classList.add('show');
}

async function handleSaveProfile() {
    const fullName = document.getElementById('edit-full-name').value;
    const email = document.getElementById('edit-email').value;
    const college = document.getElementById('edit-college').value;
    const bio = document.getElementById('edit-bio').value;
    const skills = document.getElementById('edit-skills').value;
    const phone = document.getElementById('edit-phone').value;
    const location = document.getElementById('edit-location').value;
    const title = document.getElementById('edit-title').value;
    const twitter = document.getElementById('edit-twitter').value;
    const linkedin = document.getElementById('edit-linkedin').value;
    const github = document.getElementById('edit-github').value;
    
    if (!fullName.trim() || !email.trim() || !college.trim()) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Get image data if any
        const imagePreview = document.getElementById('edit-image-preview');
        const imageData = imagePreview ? imagePreview.dataset.imageData : null;
        
        const requestBody = {
            full_name: fullName,
            email: email,
            college: college,
            bio: bio,
            skills: skills,
            phone: phone,
            location: location,
            title: title,
            twitter: twitter,
            linkedin: linkedin,
            github: github
        };
        
        // Include image data if available
        if (imageData) {
            if (imageData === 'REMOVE') {
                requestBody.profile_image = null;
            } else {
                requestBody.profile_image = imageData;
            }
        }
        
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateProfileInfo();
            showMessage('Profile updated successfully!', 'success');
            closeModals();
        } else {
            const errorData = await response.json();
            showMessage(errorData.error || 'Error updating profile', 'error');
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('show'));
}

// Function to handle clicking on user names in comments and collaborations
function handleUserNameClick(userId, username) {
    if (userId && userId !== currentUser?.id) {
        window.location.href = `/profile.html?user_id=${userId}`;
    }
}

// Make user names clickable in generated content
function makeUserNamesClickable(container) {
    const userElements = container.querySelectorAll('[data-user-id]');
    userElements.forEach(element => {
        const userId = element.dataset.userId;
        const username = element.textContent;
        if (userId && userId !== currentUser?.id) {
            element.style.cursor = 'pointer';
            element.style.color = '#28a745';
            element.style.textDecoration = 'underline';
            element.addEventListener('click', () => handleUserNameClick(userId, username));
        }
    });
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

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

function showMessage(message, type) {
    // Remove popup messages - just log to console instead
    console.log(`${type}: ${message}`);
}

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
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
    
    // Update activity timestamps
    document.querySelectorAll('.activity-time[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            element.textContent = formatDate(timestamp);
        }
    });
    
    // Update list item timestamps
    document.querySelectorAll('.list-item-date[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            element.textContent = formatDate(timestamp);
        }
    });
}

// Search functionality
function setupSearchFunction() {
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        // Allow Enter key to trigger search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

function handleSearch() {
    const searchQuery = prompt('Enter search term:');
    if (!searchQuery || searchQuery.trim() === '') return;
    
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    performSearch(searchQuery.trim(), activeTab);
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }
    
    // Show search notification
    showSearchNotification(searchTerm, 'all');
    
    // Perform search across all sections
    searchAllSections(searchTerm.toLowerCase());
    
    // Clear the search input
    searchInput.value = '';
}

function loadAllSections() {
    // Load all sections at once since we no longer have tabs
    loadUserProjects();
    loadUserCollaborations();
    loadUserDonations();
    loadUserActivity();
}

function searchAllSections(searchTerm) {
    // Search across all sections
    searchProjects(searchTerm);
    searchCollaborations(searchTerm);
    searchDonations(searchTerm);
    searchActivity(searchTerm);
}

function showSearchNotification(searchTerm, section) {
    // Remove existing notifications
    const existingNotification = document.querySelector('.search-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'search-notification';
    notification.innerHTML = `
        <span>Searching for "${searchTerm}" across all sections</span>
        <button class="clear-search-btn" onclick="clearSearch()">Clear</button>
    `;
    
    // Insert after search section
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.parentNode.insertBefore(notification, searchSection.nextSibling);
    }
}

function clearSearch() {
    // Remove search notification
    const notification = document.querySelector('.search-notification');
    if (notification) {
        notification.remove();
    }
    
    // Reload all sections to show all content
    loadAllSections();
}

function searchProjects(searchTerm) {
    const projectCards = document.querySelectorAll('.project-card');
    let visibleCount = 0;
    
    projectCards.forEach(card => {
        const title = card.querySelector('.project-title').textContent.toLowerCase();
        const description = card.querySelector('.project-description').textContent.toLowerCase();
        const techLabel = card.querySelector('.tech-label');
        const tech = techLabel ? techLabel.textContent.toLowerCase() : '';
        
        if (title.includes(searchTerm) || description.includes(searchTerm) || tech.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    showSearchResults(visibleCount, searchTerm);
}

function searchCollaborations(searchTerm) {
    const collaborationCards = document.querySelectorAll('.collaboration-card');
    let visibleCount = 0;
    
    collaborationCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const role = card.textContent.toLowerCase();
        
        if (title.includes(searchTerm) || role.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    showSearchResults(visibleCount, searchTerm);
}

function searchDonations(searchTerm) {
    const donationCards = document.querySelectorAll('.donation-card');
    let visibleCount = 0;
    
    donationCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        
        if (title.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    showSearchResults(visibleCount, searchTerm);
}

function searchActivity(searchTerm) {
    const activityItems = document.querySelectorAll('.activity-item');
    let visibleCount = 0;
    
    activityItems.forEach(item => {
        const description = item.querySelector('p').textContent.toLowerCase();
        
        if (description.includes(searchTerm)) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    showSearchResults(visibleCount, searchTerm);
}

function showSearchResults(count, searchTerm) {
    // Show search results notification
    const existingNotification = document.querySelector('.search-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'search-notification';
    notification.innerHTML = `
        <span>Found ${count} results for "${searchTerm}"</span>
        <button onclick="clearSearch()" class="clear-search-btn">Clear</button>
    `;
    
    const contentHeader = document.querySelector('.content-header');
    contentHeader.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function clearSearch() {
    // Show all items again
    const allCards = document.querySelectorAll('.project-card, .collaboration-card, .donation-card, .activity-item');
    allCards.forEach(card => {
        card.style.display = '';
    });
    
    // Remove notification
    const notification = document.querySelector('.search-notification');
    if (notification) {
        notification.remove();
    }
}