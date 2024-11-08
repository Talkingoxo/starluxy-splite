const config = {
  apiUrl: 'https://redirecting-api.aa4530607.workers.dev',
  redirectUrl: 'https://starluxy-splite.aa4530607.workers.dev'
};

class SplitUrlManager {
  constructor() {
    this.deleteId = null;
    this.init();
  }

  async fetchApi(endpoint, options = {}) {
    try {
      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      return await response.json();
    } catch (err) {
      this.showMessage('list', 'API Error');
      throw err;
    }
  }

  showMessage(type, text) {
    const msg = document.getElementById(`${type}Message`);
    msg.textContent = text;
    msg.className = `message ${text.includes('Error') ? 'error' : 'success'}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
  }

  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      campaignId: Math.random().toString(36).slice(2, 10),
      name: form.name.value,
      url1: form.url1.value,
      url2: form.url2.value,
      description: form.description.value
    };

    try {
      await this.fetchApi('/save-campaign', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      form.reset();
      this.showMessage('create', 'Split URL created successfully!');
      this.loadUrls();
    } catch (err) {
      this.showMessage('create', 'Error creating split URL');
    }
  }

  createUrlItem(campaign) {
    const splitUrl = `${config.redirectUrl}/${campaign.id}`;
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

    // Event listeners
    item.querySelector('.toggle-btn').onclick = (e) => {
      item.querySelector('.url-content').classList.toggle('active');
      e.target.classList.toggle('fa-plus');
      e.target.classList.toggle('fa-minus');
    };

    item.querySelector('.delete-btn').onclick = () => {
      this.deleteId = campaign.id;
      this.toggleModal(true);
    };

    item.querySelector('.copy-btn').onclick = () => this.copyToClipboard(splitUrl);

    return item;
  }

  async loadUrls() {
    try {
      const data = await this.fetchApi('/list-campaigns');
      const list = document.getElementById('urlList');
      list.innerHTML = data.length ? 
        data.map(campaign => this.createUrlItem(campaign).outerHTML).join('') :
        '<p style="color: var(--text-secondary);">No split URLs created yet.</p>';
    } catch (err) {
      console.error('Load error:', err);
    }
  }

  async deleteCampaign() {
    if (!this.deleteId) return;
    
    try {
      await this.fetchApi('/delete-campaign', {
        method: 'POST',
        body: JSON.stringify({ campaignId: this.deleteId })
      });
      this.showMessage('list', 'Split URL deleted successfully');
      this.loadUrls();
    } catch (err) {
      this.showMessage('list', 'Error deleting split URL');
    }
    
    this.toggleModal(false);
    this.deleteId = null;
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showMessage('list', 'URL copied to clipboard!');
    } catch {
      this.showMessage('list', 'Failed to copy URL');
    }
  }

  toggleModal(show) {
    document.getElementById('deleteModal').classList.toggle('active', show);
  }

  init() {
    document.getElementById('urlForm').onsubmit = this.handleSubmit.bind(this);
    document.getElementById('confirmDelete').onclick = this.deleteCampaign.bind(this);
    this.loadUrls();
  }
}

// Initialize app
new SplitUrlManager();
