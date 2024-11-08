const $ = id => document.getElementById(id);
let authToken = localStorage.getItem('authToken'), deleteId = null;

const API = {
    URL: 'https://redirecting-api.aa4530607.workers.dev',
    REDIRECT: 'https://starluxy-splite.aa4530607.workers.dev'
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

function displayAuth(isAuth) {
    $('loginContainer').style.display = isAuth ? 'none' : 'block';
    $('appContainer').style.display = isAuth ? 'block' : 'none';
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    displayAuth(false);
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
        
        const urlList = $('urlList');
        if (urlList.firstChild?.tagName === 'P') urlList.innerHTML = '';
        urlList.insertBefore(createUrlItem({ id: data.campaignId, ...data }), urlList.firstChild);
    } catch (err) {
        console.error(err);
    }
}

function createUrlItem(campaign) {
    const splitUrl = `${API.REDIRECT}/${campaign.id}`;
    const item = document.createElement('div');
    item.className = 'url-item';
    item.dataset.id = campaign.id;
    
    item.innerHTML = `
        <div class="url-header">
            <span>${campaign.name}</span>
            <div class="url-actions">
                <i class="fas fa-link url-icon" onclick="navigator.clipboard.writeText('${splitUrl}')" title="Copy Split URL"></i>
                <i class="fas fa-plus toggle-btn"></i>
                <i class="fas fa-trash delete-btn"></i>
            </div>
        </div>
        <div class="url-content">
            ${campaign.description ? `<p class="description"><strong>Description:</strong> ${campaign.description}</p>` : ''}
            <div class="url-buttons">
                <a href="${campaign.url1}" class="url-button" target="_blank" title="${campaign.url1}">URL 1</a>
                <a href="${campaign.url2}" class="url-button" target="_blank" title="${campaign.url2}">URL 2</a>
            </div>
        </div>
    `;

    const content = item.querySelector('.url-content');
    item.querySelector('.toggle-btn').onclick = () => {
        content.classList.toggle('active');
        event.target.classList.toggle('fa-plus');
        event.target.classList.toggle('fa-minus');
    };

    item.querySelector('.delete-btn').onclick = () => {
        deleteId = campaign.id;
        $('deleteModal').classList.toggle('active', true);
    };

    return item;
}

async function loadUrls() {
    try {
        const data = await apiCall('/list-campaigns');
        const list = $('urlList');
        list.innerHTML = !data.length ? 
            '<p style="color: var(--text-secondary);">No split URLs created yet.</p>' : 
            '';
        
        if (data.length) {
            data.sort((a, b) => b.id.localeCompare(a.id))
                .forEach(campaign => list.appendChild(createUrlItem(campaign)));
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

        const item = document.querySelector(`[data-id="${deleteId}"]`);
        if (item) {
            item.remove();
            const list = $('urlList');
            if (!list.children.length) {
                list.innerHTML = '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
            }
        }
    } catch (err) {
        console.error(err);
    }
    
    $('deleteModal').classList.toggle('active', false);
    deleteId = null;
}

const warning = document.createElement('p');
warning.className = 'warning';
warning.style.cssText = 'color: #ff4444; margin: 10px 0; display: none;';
warning.textContent = 'Links Can\'t be the same';
$('urlForm').insertBefore(warning, $('urlForm').querySelector('button'));

$('urlForm').addEventListener('input', e => {
    if (e.target.type === 'url') {
        const warning = e.target.form.querySelector('.warning');
        if (warning.style.display === 'block' && e.target.form.url1.value !== e.target.form.url2.value) {
            warning.style.display = 'none';
        }
    }
});

$('urlForm').onsubmit = handleSubmit;
$('confirmDelete').onclick = deleteCampaign;
$('loginForm').onsubmit = e => {
    e.preventDefault();
    authToken = $('password').value;
    localStorage.setItem('authToken', authToken);
    displayAuth(true);
    loadUrls();
};

displayAuth(!!authToken);
if (authToken) loadUrls();
