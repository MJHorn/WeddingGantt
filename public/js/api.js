// REST API Client
const API = {
  getToken() {
    return localStorage.getItem('wedding_session_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('wedding_session_token', token);
    } else {
      localStorage.removeItem('wedding_session_token');
    }
  },

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    const res = await fetch(endpoint, config);

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent('auth-required', { detail: data }));
      throw new Error(data.error || 'Authentication required');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    // Check if json response
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return res;
  },

  // Auth Endpoints
  async getAuthStatus() {
    return await this.request('/api/auth/status');
  },

  async setupPassphrase(password) {
    const data = await this.request('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  async login(password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  },

  // Settings Endpoints
  async getSettings() {
    return await this.request('/api/settings');
  },

  async updateSettings(settings) {
    return await this.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  // Tasks Endpoints
  async getTasks() {
    return await this.request('/api/tasks');
  },

  async createTask(taskData) {
    return await this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  async updateTask(id, taskData) {
    return await this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  async deleteTask(id) {
    return await this.request(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  async reorderTasks(payload) {
    const body = Array.isArray(payload)
      ? (typeof payload[0] === 'string' ? { orderedIds: payload } : { items: payload })
      : payload;
    return await this.request('/api/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async clearTasks() {
    return await this.request('/api/tasks/clear', {
      method: 'POST'
    });
  },

  async loadTemplate(tasks, clearExisting = false, updated_by = 'Alex') {
    return await this.request('/api/tasks/template', {
      method: 'POST',
      body: JSON.stringify({ tasks, clearExisting, updated_by })
    });
  },

  // Backup Endpoints
  async exportBackup() {
    const token = this.getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/backup/export', { headers });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-gantt-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async exportCsv() {
    const token = this.getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/backup/csv', { headers });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async restoreBackup(backupData) {
    return await this.request('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(backupData)
    });
  }
};
