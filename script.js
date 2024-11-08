let authToken = localStorage.getItem('authToken');
const API_URL = 'https://redirecting-api.aa4530607.workers.dev';
const REDIRECT_URL = 'https://starluxy-splite.aa4530607.workers.dev';
let deleteId = null;

// Core API function
async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    });
    
    if (!response.ok) throw new Error('API call failed');
    return response.json();
}

// UI Functions
function showMessage(type, text) {
    const msg = document.getElementById(`${type}Message`);
    msg.textContent = text;
    msg.className = `message ${text.includes('Error') ? 'error' : 'success'}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

function toggleModal(show) {
    document.getElementById('deleteModal').classList.toggle('active', show);
}

// Auth Functions
function login(password) {
    authToken = password;
    localStorage.setItem('authToken', authToken);
    showApp();
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    hideApp();
}

function showApp() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    loadUrls();
}

function hideApp() {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('appContainer').style.display = 'none';
}

// URL Management
async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        campaignId: Math.random().toString(36).slice(2, 10),
        name: form.name.value,
        description: form.description.value,
        url1: form.url1.value,
        url2: form.url2.value
    };

    try {
        await apiCall('/save-campaign', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        form.reset();
        showMessage('create', 'Split URL created successfully!');
        await loadUrls();  // Wait for URLs to load before continuing
    } catch (err) {
        showMessage('create', 'Error creating split URL');
    }
}

function createUrlItem(campaign) {
    const splitUrl = `${REDIRECT_URL}/${campaign.id}`;
    const item = document.createElement('div');
    item.className = 'url-item';
    
    item.innerHTML = `
        <div class="url-header">
            <span>${campaign.name}</span>
            <div>
                <i class="fas fa-plus toggle-btn"></i>
                <i class="fas fa-trash delete-btn"></i>
            </div>
        </div>
        <div class="url-content">
            <p>
                <strong>Split URL:</strong> ${splitUrl}
                <button class="copy-btn">Copy</button>
            </p>
            ${campaign.description ? `<p><strong>Description:</strong> ${campaign.description}</p>` : ''}
            <p><strong>URL 1:</strong> ${campaign.url1}</p>
            <p><strong>URL 2:</strong> ${campaign.url2}</p>
        </div>
    `;

    // Event Listeners
    item.querySelector('.toggle-btn').onclick = (e) => {
        item.querySelector('.url-content').classList.toggle('active');
        e.target.classList.toggle('fa-plus');
        e.target.classList.toggle('fa-minus');
    };

    item.querySelector('.delete-btn').onclick = () => {
        deleteId = campaign.id;
        toggleModal(true);
    };

    item.querySelector('.copy-btn').onclick = () => copyToClipboard(splitUrl);

    return item;
}

async function loadUrls() {
    const list = document.getElementById('urlList');
    list.innerHTML = '<p>Loading...</p>';  // Loading state

    try {
        const data = await apiCall('/list-campaigns');
        
        if (!Array.isArray(data)) {
            throw new Error('Invalid data received');
        }

        list.innerHTML = '';  // Clear loading state
        
        if (data.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
            return;
        }

        // Sort by newest first (assuming campaignId contains timestamp)
        data.sort((a, b) => b.id.localeCompare(a.id));
        
        data.forEach(campaign => list.appendChild(createUrlItem(campaign)));
    } catch (err) {
        list.innerHTML = '<p style="color: var(--error);">Error loading URLs. Please refresh.</p>';
    }
}

async function deleteCampaign() {
    if (!deleteId) return;
    
    try {
        await apiCall('/delete-campaign', {
            method: 'POST',
            body: JSON.stringify({ campaignId: deleteId })
        });
        
        showMessage('list', 'Split URL deleted successfully');
        await loadUrls();  // Wait for reload before continuing
    } catch (err) {
        showMessage('list', 'Error deleting split URL');
    }
    
    toggleModal(false);
    deleteId = null;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showMessage('list', 'URL copied to clipboard!');
    } catch {
        showMessage('list', 'Failed to copy URL');
    }
}

// Initialize
document.getElementById('urlForm').onsubmit = handleSubmit;
document.getElementById('confirmDelete').onclick = deleteCampaign;
document.getElementById('loginForm').onsubmit = (e) => {
    e.preventDefault();
    login(document.getElementById('password').value);
};

// Auto-login if token exists
if (authToken) showApp();
else hideApp();
