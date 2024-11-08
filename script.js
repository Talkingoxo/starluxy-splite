let authToken = localStorage.getItem('authToken'), deleteId = null;

const API = {
    URL: 'https://redirecting-api.aa4530607.workers.dev',
    REDIRECT: 'https://starluxy-splite.aa4530607.workers.dev'
};

const $ = id => document.getElementById(id);

async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${API.URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    });
    if (!res.ok) throw new Error('API failed');
    return res.json();
}

function toggleUI(isLogin) {
    $('loginContainer').style.display = isLogin ? 'block' : 'none';
    $('appContainer').style.display = isLogin ? 'none' : 'block';
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    toggleUI(true);
}

async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const {url1, url2, name, description} = form;
    const warning = form.querySelector('.warning');

    if (url1.value === url2.value) {
        warning.style.display = 'block';
        return;
    }

    try {
        const data = {
            campaignId: Date.now().toString(36) + Math.random().toString(36).substr(2),
            name: name.value,
            url1: url1.value,
            url2: url2.value,
            description: description.value
        };

        await apiCall('/save-campaign', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        const urlList = $('urlList');
        if (urlList.firstChild?.tagName === 'P') urlList.innerHTML = '';
        urlList.insertBefore(createUrlItem({ id: data.campaignId, ...data }), urlList.firstChild);
        
        form.reset();
        warning.style.display = 'none';
    } catch (err) {
        console.error(err);
    }
}

function createUrlItem(campaign) {
    const item = document.createElement('div');
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

// Setup warning
const warning = document.createElement('p');
warning.className = 'warning';
warning.textContent = 'Links Can\'t be the same';
$('urlForm').insertBefore(warning, $('urlForm').querySelector('button'));

// Event listeners
$('urlForm').addEventListener('input', e => {
    if (e.target.type === 'url') {
        const warning = e.currentTarget.querySelector('.warning');
        if (warning.style.display === 'block') {
            const form = e.currentTarget;
            if (form.url1.value !== form.url2.value) warning.style.display = 'none';
        }
    }
});

$('urlForm').onsubmit = handleSubmit;
$('confirmDelete').onclick = deleteCampaign;
$('loginForm').onsubmit = e => {
    e.preventDefault();
    authToken = $('password').value;
    localStorage.setItem('authToken', authToken);
    toggleUI(false);
    loadUrls();
};

// Init
toggleUI(!authToken);
if (authToken) loadUrls();
