// Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Main Application Controller
class WeddingGanttApp {
  constructor() {
    this.gantt = null;
    this.taskModal = null;
    this.settingsModal = null;
  }

  async init() {
    // Initialize sub-components early so UI handlers are immediately responsive
    this.taskModal = new TaskModal();
    this.settingsModal = new SettingsModal();

    const ganttContainer = document.getElementById('ganttViewContainer');
    if (ganttContainer) {
      this.gantt = new GanttChart(ganttContainer);
      this.gantt.setCallbacks({
        onRowClick: (task) => this.taskModal.open(task),
        onTaskChange: async (taskId, updates) => {
          try {
            updates.updated_by = AppState.getActiveUserName();
            const updated = await API.updateTask(taskId, updates);
            const nextTasks = AppState.tasks.map(t => t.id === taskId ? updated : t);
            AppState.setTasks(nextTasks);
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    }

    this.bindGlobalEvents();
    await this.checkAuthAndBootstrap();
  }

  bindGlobalEvents() {
    // Listen for 401 unauth
    window.addEventListener('auth-required', (e) => {
      this.showAuthScreen(e.detail.needsSetup);
    });

    // Custom events for modals
    window.addEventListener('open-task-modal', (e) => {
      if (this.taskModal) this.taskModal.open(e.detail || null);
    });

    // State changes
    AppState.subscribe((event, data) => {
      if (event === 'tasks-changed' || event === 'filter-changed' || event === 'zoom-changed') {
        this.renderCurrentView();
        this.updateCategoryFilterDropdown();
      } else if (event === 'settings-changed') {
        this.updateHeaderUI();
        this.renderCurrentView();
      }
    });

    // Add Task Button
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        if (this.taskModal) this.taskModal.open(null);
      });
    }

    // Settings Button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.open();
      });
    }

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const nextTheme = AppState.theme === 'light' ? 'dark' : 'light';
        AppState.setTheme(nextTheme);
      });
    }

    // Filters
    const searchInput = document.getElementById('taskSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        AppState.setFilter('search', e.target.value);
      });
    }

    const assigneeFilter = document.getElementById('filterAssignee');
    if (assigneeFilter) {
      assigneeFilter.addEventListener('change', (e) => {
        AppState.setFilter('assignee', e.target.value);
      });
    }

    const categoryFilter = document.getElementById('filterCategory');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        AppState.setFilter('category', e.target.value);
      });
    }

    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        AppState.setFilter('status', e.target.value);
      });
    }
  }

  async checkAuthAndBootstrap() {
    try {
      const status = await API.getAuthStatus();
      if (!status.configured) {
        this.showAuthScreen(true);
        return;
      }
      if (!status.authenticated) {
        this.showAuthScreen(false);
        return;
      }

      await this.loadApp();
    } catch (err) {
      this.showAuthScreen(false);
    }
  }

  showAuthScreen(isSetup) {
    const authOverlay = document.getElementById('authOverlay');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authBtn = document.getElementById('authSubmitBtn');
    const authInput = document.getElementById('authPasswordInput');
    const authForm = document.getElementById('authForm');

    authTitle.textContent = isSetup ? 'Welcome to Your Wedding Planner' : 'Welcome Back!';
    authSubtitle.textContent = isSetup
      ? 'Create a shared passphrase for you and your partner to protect your wedding plans.'
      : 'Enter your shared wedding passphrase to continue planning.';
    authBtn.textContent = isSetup ? 'Set Passphrase & Begin' : 'Unlock Planner';

    authOverlay.style.display = 'flex';
    authOverlay.style.pointerEvents = 'auto';
    authInput.value = '';
    authInput.focus();

    authForm.onsubmit = async (e) => {
      e.preventDefault();
      const pw = authInput.value.trim();
      if (!pw) return;

      try {
        if (isSetup) {
          await API.setupPassphrase(pw);
          showToast('Passphrase set up successfully!', 'success');
        } else {
          await API.login(pw);
          showToast('Welcome back!', 'success');
        }
        authOverlay.style.display = 'none';
        authOverlay.style.pointerEvents = 'none';
        await this.loadApp();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  async loadApp() {
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) {
      authOverlay.style.display = 'none';
      authOverlay.style.pointerEvents = 'none';
    }

    // Set saved theme
    AppState.setTheme(AppState.theme);

    // Fetch initial settings & tasks in parallel
    try {
      const [settings, tasks] = await Promise.all([
        API.getSettings(),
        API.getTasks()
      ]);

      AppState.setSettings(settings);
      AppState.setTasks(tasks);

      this.updateHeaderUI();
      this.updateCategoryFilterDropdown();
      this.renderCurrentView();
      this.startBackgroundSync();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  startBackgroundSync() {
    if (this._syncInterval) clearInterval(this._syncInterval);

    const performSync = async () => {
      // Don't interrupt if user is actively in a modal or dragging a task bar
      const modalOpen = document.querySelector('.modal-overlay.active');
      const isDragging = this.gantt && this.gantt.dragState;
      if (modalOpen || isDragging) return;

      try {
        const remoteTasks = await API.getTasks();
        const localTasks = AppState.tasks;

        // Compare if any task count, dates, status, or timestamps changed
        const hasChanged = remoteTasks.length !== localTasks.length ||
          remoteTasks.some((rt, idx) => {
            const lt = localTasks[idx];
            return !lt ||
              rt.id !== lt.id ||
              rt.updated_at !== lt.updated_at ||
              rt.status !== lt.status ||
              rt.start_date !== lt.start_date ||
              rt.end_date !== lt.end_date ||
              rt.title !== lt.title ||
              rt.category !== lt.category;
          });

        if (hasChanged) {
          AppState.setTasks(remoteTasks);
        }
      } catch (e) {
        // Silent on background sync so temporary network drops don't interrupt
      }
    };

    // 1. Sync immediately whenever partner switches back to the tab/window
    window.addEventListener('focus', () => performSync());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) performSync();
    });

    // 2. Gentle 60-second polling while tab is actively open
    this._syncInterval = setInterval(() => {
      if (!document.hidden) performSync();
    }, 60000);
  }

  updateHeaderUI() {
    const s = AppState.settings;
    document.title = `${s.wedding_title || 'Our Wedding'} • Gantt Planner`;

    const titleEl = document.getElementById('appBrandTitle');
    if (titleEl) titleEl.textContent = s.wedding_title || 'Our Wedding';

    // Countdown Badge
    const countdownEl = document.getElementById('weddingCountdownText');
    if (countdownEl && s.wedding_date) {
      const target = new Date(s.wedding_date);
      target.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        countdownEl.textContent = `💍 ${diffDays} days to go!`;
      } else if (diffDays === 0) {
        countdownEl.textContent = `💍 Today is the Big Day! ✨`;
      } else {
        countdownEl.textContent = `🥂 Happily Married! ❤️`;
      }
    }
  }

  updateCategoryFilterDropdown() {
    const catSelect = document.getElementById('filterCategory');
    if (!catSelect) return;

    const currentVal = AppState.filter.category;
    const categories = AppState.getCategories();

    catSelect.innerHTML = `<option value="all">All Categories</option>` +
      categories.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
  }

  renderCurrentView() {
    if (this.gantt) {
      this.gantt.render(AppState.getFilteredTasks(), AppState.settings.wedding_date);
    }
  }
}

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new WeddingGanttApp();
  app.init();
});
