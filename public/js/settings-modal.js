// Settings & Couple Preferences Modal Handler
class SettingsModal {
  constructor() {
    this.modalEl = document.getElementById('settingsModal');
    this.form = document.getElementById('settingsForm');
    this.bindEvents();
  }

  bindEvents() {
    const closeBtns = this.modalEl.querySelectorAll('[data-action="close-modal"]');
    closeBtns.forEach(btn => btn.addEventListener('click', () => this.close()));

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Export Backup JSON
    const exportBtn = document.getElementById('exportBackupBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        API.exportBackup().catch(err => showToast(err.message, 'error'));
      });
    }

    // Export CSV
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        API.exportCsv().catch(err => showToast(err.message, 'error'));
      });
    }

    // Restore Backup JSON
    const restoreInput = document.getElementById('restoreFileInput');
    if (restoreInput) {
      restoreInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const backupData = JSON.parse(text);
          if (!confirm(`Restore will replace all current tasks with ${backupData.tasks ? backupData.tasks.length : 0} tasks from this backup. Proceed?`)) {
            restoreInput.value = '';
            return;
          }

          await API.restoreBackup(backupData);
          showToast('Backup restored successfully! Refreshing...', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
          showToast(`Restore error: ${err.message}`, 'error');
        } finally {
          restoreInput.value = '';
        }
      });
    }

    // Clear all tasks button
    const clearAllBtn = document.getElementById('clearAllTasksBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete ALL tasks and reset to a clean slate? This cannot be undone unless you have a backup.')) {
          return;
        }
        try {
          await API.clearTasks();
          AppState.setTasks([]);
          showToast('All tasks cleared.', 'success');
          this.close();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }

  open() {
    const s = AppState.settings;
    document.getElementById('settingPartner1Name').value = s.partner1_name || 'Partner 1';
    document.getElementById('settingPartner1Color').value = s.partner1_color || '#D46A80';
    document.getElementById('settingPartner2Name').value = s.partner2_name || 'Partner 2';
    document.getElementById('settingPartner2Color').value = s.partner2_color || '#437C90';
    document.getElementById('settingWeddingTitle').value = s.wedding_title || 'Our Wedding';
    document.getElementById('settingWeddingDate').value = s.wedding_date || '2027-06-20';

    // Reset password fields
    const curPw = document.getElementById('settingCurrentPassword');
    const newPw = document.getElementById('settingNewPassword');
    if (curPw) curPw.value = '';
    if (newPw) newPw.value = '';

    this.modalEl.classList.add('active');
  }

  close() {
    this.modalEl.classList.remove('active');
  }

  async handleSubmit(e) {
    e.preventDefault();

    const payload = {
      partner1_name: document.getElementById('settingPartner1Name').value.trim() || 'Partner 1',
      partner1_color: document.getElementById('settingPartner1Color').value,
      partner2_name: document.getElementById('settingPartner2Name').value.trim() || 'Partner 2',
      partner2_color: document.getElementById('settingPartner2Color').value,
      wedding_title: document.getElementById('settingWeddingTitle').value.trim() || 'Our Wedding',
      wedding_date: document.getElementById('settingWeddingDate').value
    };

    const curPw = document.getElementById('settingCurrentPassword').value;
    const newPw = document.getElementById('settingNewPassword').value;
    if (newPw) {
      if (newPw.length < 3) {
        showToast('New passphrase must be at least 3 characters.', 'error');
        return;
      }
      payload.current_password = curPw;
      payload.new_password = newPw;
    }

    try {
      const res = await API.updateSettings(payload);
      AppState.setSettings(res.settings);
      showToast('Settings saved successfully!', 'success');
      this.close();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}
