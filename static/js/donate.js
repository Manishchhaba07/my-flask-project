// Donate page JavaScript functionality

let currentUser = null;
let currentProject = null;
let selectedAmount = 0;
let selectedPaymentMethod = 'upi';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Get project ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    if (projectId) {
        loadProject(projectId);
    } else {
        window.location.href = 'browse.html';
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Add real-time validation listeners
    setupValidationListeners();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateNavbarForLoggedInUser();
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

async function loadProject(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
            const data = await response.json();
            currentProject = data.project;
            displayProjectInfo(currentProject);
        } else {
            showMessage('Project not found', 'error');
            setTimeout(() => {
                window.location.href = 'browse.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error loading project:', error);
        showMessage('Error loading project', 'error');
    }
}

function displayProjectInfo(project) {
    document.getElementById('project-title').textContent = project.title;
    document.getElementById('project-owner').innerHTML = `
        <i class="fas fa-user"></i> ${project.owner ? project.owner.full_name : 'Unknown'}
    `;
    document.getElementById('project-category').innerHTML = `
        <i class="fas fa-tag"></i> ${project.category}
    `;
    
    const currentFunding = project.current_funding || 0;
    const fundingGoal = project.funding_goal || 0;
    const percentage = fundingGoal > 0 ? Math.round((currentFunding / fundingGoal) * 100) : 0;
    
    document.getElementById('current-funding').textContent = `$${currentFunding.toFixed(2)}`;
    document.getElementById('funding-goal').textContent = `$${fundingGoal.toFixed(2)}`;
    document.getElementById('funding-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-fill').style.width = `${Math.min(percentage, 100)}%`;
}

function setupEventListeners() {
    // Amount buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectAmount(parseFloat(this.dataset.amount));
            updateAmountButtons(this);
        });
    });
    
    // Custom amount input
    const customAmountInput = document.getElementById('custom-amount-input');
    customAmountInput.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        if (amount > 0) {
            selectAmount(amount);
            updateAmountButtons(null);
        }
    });
    
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            selectPaymentMethod(this.dataset.method);
            updatePaymentMethods(this);
        });
    });
    
    // Process donation button
    document.getElementById('process-donation').addEventListener('click', processDonation);
    
    // Card input formatting
    setupCardInputFormatting();
}

function setupValidationListeners() {
    // UPI form validation
    const upiInputs = ['upi-id', 'upi-name', 'upi-phone'];
    upiInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateDonationSummary);
        }
    });
    
    // Bank form validation
    const bankInputs = ['bank-account-name', 'bank-account-number', 'bank-ifsc', 'bank-name', 'bank-phone'];
    bankInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateDonationSummary);
        }
    });
    
    // Card form validation
    const cardInputs = ['card-number', 'expiry', 'cvv', 'cardholder-name'];
    cardInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateDonationSummary);
        }
    });
    
    // Phone number validation
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 10);
        });
    });
    
    // IFSC code formatting
    const ifscInput = document.getElementById('bank-ifsc');
    if (ifscInput) {
        ifscInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
        });
    }
}

function selectAmount(amount) {
    selectedAmount = amount;
    updateDonationSummary();
    
    // Clear custom input if amount button was clicked
    if (event && event.target.classList.contains('amount-btn')) {
        document.getElementById('custom-amount-input').value = '';
    }
}

function updateAmountButtons(activeBtn) {
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    updatePaymentDetails();
}

function updatePaymentMethods(activeOption) {
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('active');
    });
    
    activeOption.classList.add('active');
}

function updatePaymentDetails() {
    // Hide all payment details
    document.querySelectorAll('.payment-detail').forEach(detail => {
        detail.style.display = 'none';
    });
    
    // Show selected payment method details
    const selectedDetail = document.getElementById(`${selectedPaymentMethod}-details`);
    if (selectedDetail) {
        selectedDetail.style.display = 'block';
    }
}

function updateDonationSummary() {
    const processingFee = selectedAmount * 0.029; // 2.9% processing fee
    const total = selectedAmount + processingFee;
    
    document.getElementById('summary-amount').textContent = `$${selectedAmount.toFixed(2)}`;
    document.getElementById('summary-fee').textContent = `$${processingFee.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `$${total.toFixed(2)}`;
    
    // Enable/disable donation button based on amount and payment method validation
    const donateBtn = document.getElementById('process-donation');
    donateBtn.disabled = selectedAmount <= 0 || !validatePaymentDetails();
}

function validatePaymentDetails() {
    if (selectedPaymentMethod === 'upi') {
        const upiId = document.getElementById('upi-id')?.value.trim();
        const upiName = document.getElementById('upi-name')?.value.trim();
        const upiPhone = document.getElementById('upi-phone')?.value.trim();
        return upiId && upiName && upiPhone && upiPhone.length === 10;
    } else if (selectedPaymentMethod === 'bank') {
        const accountName = document.getElementById('bank-account-name')?.value.trim();
        const accountNumber = document.getElementById('bank-account-number')?.value.trim();
        const ifsc = document.getElementById('bank-ifsc')?.value.trim();
        const bankName = document.getElementById('bank-name')?.value.trim();
        const phone = document.getElementById('bank-phone')?.value.trim();
        return accountName && accountNumber && ifsc && bankName && phone && phone.length === 10;
    } else if (selectedPaymentMethod === 'card') {
        const cardNumber = document.getElementById('card-number')?.value.trim();
        const expiry = document.getElementById('expiry')?.value.trim();
        const cvv = document.getElementById('cvv')?.value.trim();
        const cardholderName = document.getElementById('cardholder-name')?.value.trim();
        return cardNumber && expiry && cvv && cardholderName;
    }
    return false;
}

function setupCardInputFormatting() {
    const cardNumber = document.getElementById('card-number');
    const expiry = document.getElementById('expiry');
    const cvv = document.getElementById('cvv');
    
    if (cardNumber) {
        cardNumber.addEventListener('input', function() {
            let value = this.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            this.value = formattedValue;
        });
    }
    
    if (expiry) {
        expiry.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            this.value = value;
        });
    }
    
    if (cvv) {
        cvv.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showMessage('Copied to clipboard!', 'success');
    }).catch(function(error) {
        console.error('Error copying to clipboard:', error);
        showMessage('Failed to copy to clipboard', 'error');
    });
}

async function processDonation() {
    if (!currentUser) {
        showMessage('Please login to make a donation', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    if (selectedAmount <= 0) {
        showMessage('Please select a valid donation amount', 'error');
        return;
    }
    
    if (!currentProject) {
        showMessage('Project information not available', 'error');
        return;
    }
    
    if (!validatePaymentDetails()) {
        showMessage('Please fill in all required payment details', 'error');
        return;
    }
    
    const message = document.getElementById('message-input').value;
    
    // Collect payment details based on selected method
    let paymentDetails = {};
    if (selectedPaymentMethod === 'upi') {
        paymentDetails = {
            upi_id: document.getElementById('upi-id').value.trim(),
            account_name: document.getElementById('upi-name').value.trim(),
            phone: document.getElementById('upi-phone').value.trim()
        };
    } else if (selectedPaymentMethod === 'bank') {
        paymentDetails = {
            account_name: document.getElementById('bank-account-name').value.trim(),
            account_number: document.getElementById('bank-account-number').value.trim(),
            ifsc_code: document.getElementById('bank-ifsc').value.trim(),
            bank_name: document.getElementById('bank-name').value.trim(),
            branch_name: document.getElementById('bank-branch').value.trim(),
            phone: document.getElementById('bank-phone').value.trim()
        };
    } else if (selectedPaymentMethod === 'card') {
        paymentDetails = {
            card_number: document.getElementById('card-number').value.replace(/\s/g, ''),
            expiry: document.getElementById('expiry').value,
            cvv: document.getElementById('cvv').value,
            cardholder_name: document.getElementById('cardholder-name').value.trim()
        };
    }
    
    try {
        // Show loading state
        const donateBtn = document.getElementById('process-donation');
        const originalText = donateBtn.innerHTML;
        donateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        donateBtn.disabled = true;
        
        // This is detail collection only - no actual payment processing
        // In a real implementation, this would save donation intent and contact details
        
        showMessage('Thank you! Your donation details have been recorded. The project owner will contact you to complete the donation process.', 'success');
        setTimeout(() => {
            window.location.href = `browse.html?project=${currentProject.id}`;
        }, 3000);
    } catch (error) {
        console.error('Error processing donation:', error);
        showMessage('Error processing donation. Please try again.', 'error');
    } finally {
        // Reset button state
        const donateBtn = document.getElementById('process-donation');
        donateBtn.innerHTML = '<i class="fas fa-heart"></i> Submit Donation Details';
        donateBtn.disabled = selectedAmount <= 0;
    }
}

function showMessage(message, type) {
    const container = document.getElementById('message-container');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

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

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    updateDonationSummary();
    updatePaymentDetails();
});