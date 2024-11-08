let authToken = localStorage.getItem('authToken');

// Modified fetch function to include auth
async function fetchApi(endpoint, options = {}) {
    if (!authToken) {
        hideApp();
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
    };

    const response = await fetch(endpoint, { ...options, headers });
    
    if (response.status === 401) {
        logout();
        return null;
    }

    return response;
}

// Replace all fetch() calls with fetchApi()

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

// Check auth on load
if (authToken) {
    showApp();
} else {
    hideApp();
}

// Add login form handler
document.getElementById('loginForm').onsubmit = async function(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    await login(password);
};
