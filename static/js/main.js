// Main page JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize typewriter effect
    initTypeWriter();
    
    // Load featured projects and stats
    loadFeaturedProjects();
    loadStats();
    
    // Check authentication status
    checkAuthStatus();
});

// Typewriter effect for hero text
function initTypeWriter() {
    const text = "Turn Your College Projects Into Reality";
    let i = 0;
    const speed = 100;
    const element = document.getElementById("type-text");

    function typeWriter() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(typeWriter, speed);
        }
    }
    
    if (element) {
        typeWriter();
    }
}

// Check authentication status and update navbar
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            updateNavbarForLoggedInUser(data.user);
        }
    } catch (error) {
        console.log('User not authenticated');
    }
}

function updateNavbarForLoggedInUser(user) {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const dashboardLink = document.getElementById('dashboard-link');
    const profileLink = document.getElementById('profile-link');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    
    if (user) {
        // Hide login/register buttons
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        
        // Show authenticated user elements
        if (dashboardLink) dashboardLink.style.display = 'inline-flex';
        if (profileLink) profileLink.style.display = 'inline-flex';
        if (userMenu) {
            userMenu.style.display = 'inline-block';
            if (userName) {
                userName.textContent = user.first_name || user.username || 'User';
            }
        }
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error logging out', 'error');
    }
}

// Load featured projects for homepage
async function loadFeaturedProjects() {
    try {
        const response = await fetch('/api/projects?per_page=6&sort=recent');
        
        if (response.ok) {
            const data = await response.json();
            displayFeaturedProjects(data.projects);
        } else {
            console.error('Failed to load featured projects');
        }
    } catch (error) {
        console.error('Error loading featured projects:', error);
    }
}

function displayFeaturedProjects(projects) {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid || projects.length === 0) return;

    projectsGrid.innerHTML = projects.map(project => `
        <div class="project-card" onclick="viewProject(${project.id})">
            <div class="project-header">
                <span class="project-category">${project.category}</span>
                <span class="project-date">${formatDate(project.created_at)}</span>
            </div>
            <h3 class="project-title">${escapeHtml(project.title)}</h3>
            <div class="project-owner">
                <i class="fas fa-user"></i>
                <span>${escapeHtml(project.owner?.full_name || 'Unknown')}</span>
            </div>
            <p class="project-description">${escapeHtml(project.description)}</p>
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
    `).join('');
}

function viewProject(projectId) {
    window.location.href = `browse.html?project=${projectId}`;
}

// Load platform statistics
async function loadStats() {
    try {
        const response = await fetch('/api/homepage/stats'); // Get homepage stats including donations
        
        if (response.ok) {
            const data = await response.json();
            updateStatsElements(data.totalProjects, data.totalUsers, data.totalFunding);
        } else {
            // Fallback to projects API if homepage stats not available
            const projectsResponse = await fetch('/api/projects?per_page=1000');
            if (projectsResponse.ok) {
                const projectsData = await projectsResponse.json();
                updateStats(projectsData);
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values if API fails
        updateStatsElements(0, 0, 0);
    }
}

function updateStats(data) {
    const projects = data.projects || [];
    const totalProjects = projects.length;
    const totalUsers = new Set(projects.map(p => p.owner?.id)).size;
    const totalFunding = projects.reduce((sum, p) => sum + (p.current_funding || 0), 0);
    
    updateStatsElements(totalProjects, totalUsers, totalFunding);
}

function updateStatsElements(projects, users, funding) {
    const totalProjectsEl = document.getElementById('total-projects');
    const totalUsersEl = document.getElementById('total-users');
    const totalFundingEl = document.getElementById('total-funding');
    
    if (totalProjectsEl) {
        totalProjectsEl.textContent = `${projects}+`;
    }
    
    if (totalUsersEl) {
        totalUsersEl.textContent = `${users}+`;
    }
    
    if (totalFundingEl) {
        // Format funding amount appropriately
        if (funding >= 1000) {
            totalFundingEl.textContent = `$${(funding / 1000).toFixed(1)}K+`;
        } else if (funding > 0) {
            totalFundingEl.textContent = `$${funding.toFixed(0)}+`;
        } else {
            totalFundingEl.textContent = `$0`;
        }
    }
}

// Utility functions
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

// Toggle user dropdown menu
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu && !userMenu.contains(event.target)) {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
});

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    
    // Check if we're on the home page and load stats
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadStats();
    }
    
    // Get any error message from session storage
    const errorMessage = sessionStorage.getItem('errorMessage');
    if (errorMessage) {
        showNotification(errorMessage, 'error');
        sessionStorage.removeItem('errorMessage');
    }
    
    // Get any success message from session storage
    const successMessage = sessionStorage.getItem('successMessage');
    if (successMessage) {
        showNotification(successMessage, 'success');
        sessionStorage.removeItem('successMessage');
    }
});
