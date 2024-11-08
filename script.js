let authToken = localStorage.getItem('authToken');
const API = {
    URL: 'https://redirecting-api.aa4530607.workers.dev',
    REDIRECT: 'https://starluxy-splite.aa4530607.workers.dev'
};
let deleteId = null;

const DOM = {
    get: id => document.getElementById(id),
    create: tag => document.createElement(tag)
};

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    DOM.get('loginContainer').style.display = 'block';
    DOM.get('appContainer').style.display = 'none';
}

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

    const data = {
        campaignId: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: form.name.value,
        url1, url2,
        description: form.description.value
    };

    try {
        await apiCall('/save-campaign', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        form.reset();
        warning.style.display = 'none';
        
        const urlList = DOM.get('urlList');
        if (urlList.firstChild?.tagName === 'P') urlList.innerHTML = '';
        urlList.insertBefore(createUrlItem({ id: data.campaignId, ...data }), urlList.firstChild);
    } catch (err) {
        console.error(err);
    }
}

function createUrlItem(campaign) {
    const item = DOM.create('div');
    item.className = 'url-item';
    item.dataset.id = campaign.id;
    
    item.innerHTML = `
        <div class="url-header">
            <span>${campaign.name}</span>
            <div class="url-actions">
                <i class="fas fa-link url-icon" onclick="navigator.clipboard.writeText('${API.REDIRECT}/${campaign.id}')"></i>
                <i class="fas fa-plus toggle-btn"></i>
                <i class="fas fa-trash delete-btn"></i>
            </div>
        </div>
        <div class="url-content">
            <p>
                <strong>Split URL:</strong> 
                ${API.REDIRECT}/${campaign.id}
            </p>
            ${campaign.description ? `<p><strong>Description:</strong> ${campaign.description}</p>` : ''}
            <p><strong>URL 1:</strong> ${campaign.url1}</p>
            <p><strong>URL 2:</strong> ${campaign.url2}</p>
        </div>
    `;

    item.querySelector('.toggle-btn').onclick = (e) => {
        item.querySelector('.url-content').classList.toggle('active');
        e.target.classList.toggle('fa-plus');
        e.target.classList.toggle('fa-minus');
    };

    item.querySelector('.delete-btn').onclick = () => {
        deleteId = campaign.id;
        DOM.get('deleteModal').classList.toggle('active', true);
    };

    return item;
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
            if (!list.children.length) {
                list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
            }
        }
    } catch (err) {
        console.error(err);
    }
    
    toggleModal(false);
    deleteId = null;
}

function toggleModal(show) {
    DOM.get('deleteModal').classList.toggle('active', show);
    deleteId = show ? deleteId : null;
}

// Add warning element to form
const warningEl = DOM.create('p');
warningEl.className = 'warning';
warningEl.style.cssText = 'color: #ff4444; margin: 10px 0; display: none;';
warningEl.textContent = 'Links Can\'t be the same';
DOM.get('urlForm').insertBefore(warningEl, DOM.get('urlForm').querySelector('button'));

// Watch for URL changes to hide warning
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

// Init
const urlForm = DOM.get('urlForm');
const loginForm = DOM.get('loginForm');

urlForm.onsubmit = handleSubmit;
DOM.get('confirmDelete').onclick = deleteCampaign;
loginForm.onsubmit = e => {
    e.preventDefault();
    authToken = loginForm.password.value;
    localStorage.setItem('authToken', authToken);
    DOM.get('loginContainer').style.display = 'none';
    DOM.get('appContainer').style.display = 'block';
    loadUrls();
};

// Check auth on load
if (authToken) {
    DOM.get('loginContainer').style.display = 'none';
    DOM.get('appContainer').style.display = 'block';
    loadUrls();
} else {
    DOM.get('loginContainer').style.display = 'block';
    DOM.get('appContainer').style.display = 'none';
}
