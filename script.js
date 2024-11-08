let authToken = localStorage.getItem('authToken');
let deleteId = null;

const API = {
    URL: 'https://redirecting-api.aa4530607.workers.dev',
    REDIRECT: 'https://starluxy-splite.aa4530607.workers.dev'
};

const DOM = {
    get: id => document.getElementById(id),
    create: tag => document.createElement(tag),
    toggle: (id, show) => DOM.get(id).style.display = show ? 'block' : 'none'
};

// Core Functions
async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${API.URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    });
    if (!response.ok) throw new Error('API failed');
    return response.json();
}

function toggleDisplay(loginVisible) {
    DOM.toggle('loginContainer', loginVisible);
    DOM.toggle('appContainer', !loginVisible);
}

function toggleSidebar() {
    DOM.get('sidebar').classList.toggle('active');
}

function toggleModal(show) {
    DOM.get('deleteModal').classList.toggle('active', show);
    deleteId = show ? deleteId : null;
}

function setNoUrlsMessage(list) {
    list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
}

// Auth Functions
function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    toggleDisplay(true);
}

// URL Management
async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const { url1, url2, name, description } = form;
    const warning = form.querySelector('.warning');

    if (url1.value === url2.value) {
        warning.style.display = 'block';
        return;
    }

    const data = {
        campaignId: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: name.value,
        url1: url1.value,
        url2: url2.value,
        description: description.value
    };

    try {
        await apiCall('/save-campaign', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const urlList = DOM.get('urlList');
        if (urlList.firstChild?.tagName === 'P') urlList.innerHTML = '';
        urlList.insertBefore(createUrlItem({ id: data.campaignId, ...data }), urlList.firstChild);
        
        form.reset();
        warning.style.display = 'none';
    } catch (err) {
        console.error(err);
    }
}

function createUrlItem(campaign) {
    const item = DOM.create('div');
    item.className = 'url-item';
    item.dataset.id = campaign.id;
    
    const splitUrl = `${API.REDIRECT}/${campaign.id}`;
    
    item.innerHTML = `
        <div class="url-header">
            <span>${campaign.name}</span>
            <div class="url-actions">
                <i class="fas fa-link url-icon" onclick="navigator.clipboard.writeText('${splitUrl}')"></i>
                <i class="fas fa-plus toggle-btn"></i>
                <i class="fas fa-trash delete-btn"></i>
            </div>
        </div>
        <div class="url-content">
            <p><strong>Split URL:</strong> ${splitUrl}</p>
            ${campaign.description ? `<p><strong>Description:</strong> ${campaign.description}</p>` : ''}
            <p><strong>URL 1:</strong> ${campaign.url1}</p>
            <p><strong>URL 2:</strong> ${campaign.url2}</p>
        </div>
    `;

    const content = item.querySelector('.url-content');
    const toggleBtn = item.querySelector('.toggle-btn');

    toggleBtn.onclick = () => {
        content.classList.toggle('active');
        toggleBtn.classList.toggle('fa-plus');
        toggleBtn.classList.toggle('fa-minus');
    };

    item.querySelector('.delete-btn').onclick = () => {
        deleteId = campaign.id;
        toggleModal(true);
    };

    return item;
}

async function loadUrls() {
    try {
        const data = await apiCall('/list-campaigns');
        const list = DOM.get('urlList');
        list.innerHTML = '';
        
        if (!data.length) {
            setNoUrlsMessage(list);
            return;
        }

        data.sort((a, b) => b.id.localeCompare(a.id))
            .forEach(campaign => list.appendChild(createUrlItem(campaign)));
    } catch (err) {
        console.error(err);
    }
}

async function deleteCampaign() {
    if (!deleteId) return;
    
    try {
        await apiCall('/delete-campaign', {
            method: 'POST',
            body: JSON.stringify({ campaignId: deleteId })
        });

        const itemToRemove = document.querySelector(`[data-id="${deleteId}"]`);
        if (itemToRemove) {
            itemToRemove.remove();
            const list = DOM.get('urlList');
            if (!list.children.length) setNoUrlsMessage(list);
        }
    } catch (err) {
        console.error(err);
    }
    
    toggleModal(false);
    deleteId = null;
}

// Setup warning element
const warningEl = DOM.create('p');
warningEl.className = 'warning';
warningEl.style.cssText = 'color: #ff4444; margin: 10px 0; display: none;';
warningEl.textContent = 'Links Can\'t be the same';
DOM.get('urlForm').insertBefore(warningEl, DOM.get('urlForm').querySelector('button'));

// Event Listeners
DOM.get('urlForm').addEventListener('input', function(e) {
    if (e.target.type === 'url') {
        const warning = this.querySelector('.warning');
        if (warning.style.display === 'block') {
            if (this.url1.value !== this.url2.value) {
                warning.style.display = 'none';
            }
        }
    }
});

// Initialize
const urlForm = DOM.get('urlForm');
const loginForm = DOM.get('loginForm');

urlForm.onsubmit = handleSubmit;
DOM.get('confirmDelete').onclick = deleteCampaign;
loginForm.onsubmit = e => {
    e.preventDefault();
    authToken = loginForm.password.value;
    localStorage.setItem('authToken', authToken);
    toggleDisplay(false);
    loadUrls();
};

// Initial auth check
toggleDisplay(!authToken);
if (authToken) loadUrls();
