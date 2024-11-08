let authToken = localStorage.getItem('authToken');
let deleteId = null;
let latestUrl = '';

const API = {
    URL: 'https://redirecting-api.aa4530607.workers.dev',
    REDIRECT: 'https://starluxy-splite.aa4530607.workers.dev'
};

const DOM = {
    get: id => document.getElementById(id),
    create: tag => document.createElement(tag),
    query: selector => document.querySelector(selector)
};

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

function toggleModal(show) {
    DOM.get('deleteModal').classList.toggle('active', show);
    deleteId = show ? deleteId : null;
}

function toggleSidebar() {
    DOM.query('.sidebar').classList.toggle('active');
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
                <i class="fas fa-link" title="Copy URL"></i>
                <i class="fas fa-trash" title="Delete"></i>
            </div>
        </div>
        <div class="url-content">
            ${campaign.description ? `<p><strong>Description:</strong> ${campaign.description}</p>` : ''}
            <p><strong>URL 1:</strong> ${campaign.url1}</p>
            <p><strong>URL 2:</strong> ${campaign.url2}</p>
        </div>
    `;

    item.querySelector('.fa-link').onclick = () => copyToClipboard(splitUrl);
    item.querySelector('.fa-trash').onclick = () => {
        deleteId = campaign.id;
        toggleModal(true);
    };

    return item;
}

async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const url1 = form.url1.value;
    const url2 = form.url2.value;
    const warning = form.querySelector('.warning');

    if (url1 === url2) {
        warning.style.display = 'block';
        return;
    }

    const campaignId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const data = {
        campaignId,
        name: form.name.value,
        url1, url2,
        description: form.description.value
    };

    try {
        await apiCall('/save-campaign', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        // Update latest URL and reset form
        latestUrl = `${API.REDIRECT}/${campaignId}`;
        form.reset();
        warning.style.display = 'none';
        
        // Add new item to list
        const urlList = DOM.get('urlList');
        if (urlList.firstChild?.tagName === 'P') {
            urlList.innerHTML = '';
        }
        urlList.insertBefore(createUrlItem({ id: campaignId, ...data }), urlList.firstChild);
    } catch (err) {
        console.error(err);
    }
}

async function loadUrls() {
    try {
        const data = await apiCall('/list-campaigns');
        const list = DOM.get('urlList');
        list.innerHTML = '';
        
        if (!data.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
            return;
        }

        // Sort by newest first
        data.sort((a, b) => b.id.localeCompare(a.id))
            .forEach(campaign => list.appendChild(createUrlItem(campaign)));

        // Set latest URL if exists
        if (data[0]) {
            latestUrl = `${API.REDIRECT}/${data[0].id}`;
        }
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
            if (!list.children.length) {
                list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
            }
        }
    } catch (err) {
        console.error(err);
    }
    
    toggleModal(false);
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error(err);
    }
}

// URL change handler
DOM.get('urlForm').addEventListener('input', function(e) {
    if (e.target.type === 'url') {
        const warning = this.querySelector('.warning');
        if (warning.style.display === 'block') {
            const url1 = this.url1.value;
            const url2 = this.url2.value;
            if (url1 !== url2) {
                warning.style.display = 'none';
            }
        }
    }
});

// Login/Logout
function login(password) {
    authToken = password;
    localStorage.setItem('authToken', authToken);
    DOM.get('loginContainer').style.display = 'none';
    DOM.get('appContainer').style.display = 'block';
    loadUrls();
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    DOM.get('loginContainer').style.display = 'block';
    DOM.get('appContainer').style.display = 'none';
}

// Initialize
DOM.get('urlForm').onsubmit = handleSubmit;
DOM.get('confirmDelete').onclick = deleteCampaign;
DOM.get('loginForm').onsubmit = e => {
    e.preventDefault();
    login(e.target.password.value);
};
DOM.query('.sidebar-toggle').onclick = toggleSidebar;
DOM.query('.copy-latest').onclick = () => copyToClipboard(latestUrl);

// Check auth on load
if (authToken) {
    DOM.get('loginContainer').style.display = 'none';
    DOM.get('appContainer').style.display = 'block';
    loadUrls();
} else {
    DOM.get('loginContainer').style.display = 'block';
    DOM.get('appContainer').style.display = 'none';
}
