let authToken = localStorage.getItem('authToken');
const API_URL = 'https://redirecting-api.aa4530607.workers.dev';
const REDIRECT_URL = 'https://starluxy-splite.aa4530607.workers.dev';

// Auth functions
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

// Message display
function showMessage(type, text) {
    const msg = document.getElementById(`${type}Message`);
    msg.textContent = text;
    msg.className = `message ${text.includes('Error') ? 'error' : 'success'}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

// URL handling
async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const campaignId = Math.random().toString(36).slice(2, 10);
    
    try {
        const response = await fetch(`${API_URL}/save-campaign`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                campaignId,
                name: form.name.value,
                description: form.description.value,
                url1: form.url1.value,
                url2: form.url2.value
            })
        });

        if (response.ok) {
            form.reset();
            showMessage('create', 'Split URL created successfully!');
            loadUrls();
        } else {
            showMessage('create', 'Error creating split URL');
        }
    } catch (err) {
        showMessage('create', 'Error creating split URL');
    }
}

function createUrlItem(campaign) {
    const item = document.createElement('div');
    item.className = 'url-item';
    
    const splitUrl = `${REDIRECT_URL}/${campaign.id}`;
    
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

    const toggleBtn = item.querySelector('.toggle-btn');
    const content = item.querySelector('.url-content');
    const deleteBtn = item.querySelector('.delete-btn');
    const copyBtn = item.querySelector('.copy-btn');
    
    toggleBtn.onclick = () => {
        content.classList.toggle('active');
        toggleBtn.classList.toggle('fa-plus');
        toggleBtn.classList.toggle('fa-minus');
    };

    deleteBtn.onclick = () => {
        deleteId = campaign.id;
        toggleModal(true);
    };

    copyBtn.onclick = () => copyToClipboard(splitUrl);

    return item;
}

async function loadUrls() {
    try {
        const response = await fetch(`${API_URL}/list-campaigns`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();

        const list = document.getElementById('urlList');
        list.innerHTML = '';

        if (Array.isArray(data)) {
            if (data.length === 0) {
                list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
            } else {
                data.forEach(campaign => list.appendChild(createUrlItem(campaign)));
            }
        }
    } catch (err) {
        console.error('Load error:', err);
    }
}

// Delete functionality
let deleteId = null;

function toggleModal(show) {
    document.getElementById('deleteModal').classList.toggle('active', show);
}

async function deleteCampaign() {
    if (!deleteId) return;
    
    try {
        const response = await fetch(`${API_URL}/delete-campaign`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ campaignId: deleteId })
        });

        if (response.ok) {
            showMessage('list', 'Split URL deleted successfully');
            loadUrls();
        }
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
document.getElementById('loginForm').onsubmit = function(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    login(password);
};

// Check auth on load
if (authToken) {
    showApp();
} else {
    hideApp();
}
