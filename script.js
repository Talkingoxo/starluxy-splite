const API_URL = 'https://redirecting-api.aa4530607.workers.dev';
const REDIRECT_URL = 'https://starluxy-splite.aa4530607.workers.dev';

function showMessage(type, text) {
    const msg = document.getElementById(`${type}Message`);
    msg.textContent = text;
    msg.className = `message ${text.includes('Error') ? 'error' : 'success'}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

// Form Submit Handler
document.getElementById('urlForm').onsubmit = async function(e) {
    e.preventDefault();
    
    const data = {
        campaignId: Math.random().toString(36).slice(2, 10),
        name: this.name.value,
        url1: this.url1.value,
        url2: this.url2.value,
        description: this.description.value
    };

    try {
        const response = await fetch(`${API_URL}/save-campaign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            this.reset();
            showMessage('create', 'Split URL created successfully!');
            loadUrls();
        }
    } catch (err) {
        showMessage('create', 'Error creating split URL');
    }
};

// Load and display URLs
async function loadUrls() {
    const list = document.getElementById('urlList');
    
    try {
        const response = await fetch(`${API_URL}/list-campaigns`);
        const campaigns = await response.json();
        
        if (!campaigns.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
            return;
        }

        list.innerHTML = campaigns.map(campaign => `
            <div class="url-item">
                <div class="url-header">
                    <span>${campaign.name}</span>
                    <div>
                        <i class="fas fa-plus toggle-btn" onclick="toggleContent(this)"></i>
                        <i class="fas fa-trash" onclick="deleteCampaign('${campaign.id}')"></i>
                    </div>
                </div>
                <div class="url-content">
                    <p>
                        <strong>Split URL:</strong> 
                        ${REDIRECT_URL}/${campaign.id}
                        <button onclick="copyUrl('${REDIRECT_URL}/${campaign.id}')">Copy</button>
                    </p>
                    ${campaign.description ? `<p><strong>Description:</strong> ${campaign.description}</p>` : ''}
                    <p><strong>URL 1:</strong> ${campaign.url1}</p>
                    <p><strong>URL 2:</strong> ${campaign.url2}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p style="color: var(--error);">Error loading URLs</p>';
    }
}

// Toggle content visibility
function toggleContent(btn) {
    const content = btn.closest('.url-header').nextElementSibling;
    content.classList.toggle('active');
    btn.classList.toggle('fa-plus');
    btn.classList.toggle('fa-minus');
}

// Copy URL to clipboard
async function copyUrl(url) {
    try {
        await navigator.clipboard.writeText(url);
        showMessage('list', 'URL copied to clipboard!');
    } catch {
        showMessage('list', 'Failed to copy URL');
    }
}

// Delete campaign
async function deleteCampaign(id) {
    if (!confirm('Are you sure you want to delete this URL?')) return;

    try {
        const response = await fetch(`${API_URL}/delete-campaign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: id })
        });

        if (response.ok) {
            showMessage('list', 'URL deleted successfully');
            loadUrls();
        }
    } catch {
        showMessage('list', 'Error deleting URL');
    }
}

// Load URLs on page load
loadUrls();
