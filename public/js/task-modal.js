// Task Modal Handler (Create / Edit)
class TaskModal {
  constructor() {
    this.modalEl = document.getElementById('taskModal');
    this.form = document.getElementById('taskForm');
    this.deleteBtn = document.getElementById('deleteTaskBtn');
    this.checklistItems = [];
    this.currentTaskId = null;

    this.bindEvents();
  }

  bindEvents() {
    // Close modal on background click or cancel button
    const closeBtns = this.modalEl.querySelectorAll('[data-action="close-modal"]');
    closeBtns.forEach(btn => btn.addEventListener('click', () => this.close()));

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Milestone checkbox toggle: sets duration = 0 or matches start date
    const milestoneCheck = document.getElementById('taskIsMilestone');
    const endDateInput = document.getElementById('taskEndDate');
    const startDateInput = document.getElementById('taskStartDate');
    if (milestoneCheck && endDateInput && startDateInput) {
      milestoneCheck.addEventListener('change', () => {
        if (milestoneCheck.checked) {
          endDateInput.value = startDateInput.value;
          endDateInput.disabled = true;
        } else {
          endDateInput.disabled = false;
        }
      });
      startDateInput.addEventListener('change', () => {
        if (milestoneCheck.checked) {
          endDateInput.value = startDateInput.value;
        }
      });
    }

    // Add Checklist Item
    const addChecklistBtn = document.getElementById('addChecklistItemBtn');
    const checklistInput = document.getElementById('newChecklistInput');
    if (addChecklistBtn && checklistInput) {
      const addItem = () => {
        const text = checklistInput.value.trim();
        if (!text) return;
        this.checklistItems.push({
          id: 'c_' + Date.now(),
          text,
          completed: false
        });
        checklistInput.value = '';
        this.renderChecklist();
      };
      addChecklistBtn.addEventListener('click', addItem);
      checklistInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addItem();
        }
      });
    }

    // Category input live preview
    const catInput = document.getElementById('taskCategory');
    if (catInput) {
      catInput.addEventListener('input', () => this.updateCategoryBadgePreview());
      catInput.addEventListener('change', () => this.updateCategoryBadgePreview());
    }

    // Form Submit
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Delete Task
    if (this.deleteBtn) {
      this.deleteBtn.addEventListener('click', () => this.handleDelete());
    }
  }

  updateCategoryBadgePreview() {
    const badge = document.getElementById('taskCategoryBadgePreview');
    const input = document.getElementById('taskCategory');
    if (!badge || !input) return;

    const val = input.value.trim();
    if (!val) {
      badge.style.display = 'none';
      return;
    }

    const catColor = AppState.getCategoryColor(val);
    badge.textContent = `● ${val}`;
    badge.style.display = 'inline-block';
    badge.style.background = catColor.lightBg;
    badge.style.color = catColor.text;
    badge.style.border = `1px solid ${catColor.border}`;
  }

  open(task = null) {
    this.currentTaskId = task ? task.id : null;
    const titleEl = document.getElementById('taskModalTitle');
    if (titleEl) {
      titleEl.textContent = task ? 'Edit Task' : 'Add New Task';
    }

    if (this.deleteBtn) {
      this.deleteBtn.style.display = task ? 'inline-flex' : 'none';
    }

    // Set partner labels in the Assignee select
    const p1Opt = document.getElementById('assigneeOptionP1');
    const p2Opt = document.getElementById('assigneeOptionP2');
    const bothOpt = document.getElementById('assigneeOptionBoth');
    if (p1Opt) p1Opt.textContent = AppState.settings.partner1_name || 'Partner 1';
    if (p2Opt) p2Opt.textContent = AppState.settings.partner2_name || 'Partner 2';
    if (bothOpt) bothOpt.textContent = `Both (${AppState.settings.partner1_name || 'P1'} & ${AppState.settings.partner2_name || 'P2'})`;

    // Populate existing categories datalist from couple's current categories
    const datalist = document.getElementById('existingCategoriesList');
    if (datalist) {
      const existing = AppState.getCategories();
      datalist.innerHTML = existing.map(c => `<option value="${c}">`).join('');
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Populate Fields
    document.getElementById('taskTitle').value = task ? task.title : '';
    document.getElementById('taskCategory').value = task ? (task.category || '') : '';
    this.updateCategoryBadgePreview();
    document.getElementById('taskStartDate').value = task ? task.start_date : todayStr;
    document.getElementById('taskEndDate').value = task ? task.end_date : todayStr;
    document.getElementById('taskIsMilestone').checked = task ? Boolean(task.is_milestone) : false;
    document.getElementById('taskStatus').value = task ? task.status : 'todo';
    document.getElementById('taskProgress').value = task ? task.progress : 0;
    document.getElementById('taskProgressVal').textContent = `${task ? task.progress : 0}%`;
    document.getElementById('taskAssignee').value = task ? task.assignee : 'both';
    document.getElementById('taskPriority').value = task ? task.priority : 'medium';
    document.getElementById('taskNotes').value = task ? (task.notes || '') : '';

    const endDateInput = document.getElementById('taskEndDate');
    if (endDateInput) {
      endDateInput.disabled = task ? Boolean(task.is_milestone) : false;
    }

    // Checklist
    this.checklistItems = task && task.checklist ? [...task.checklist] : [];
    this.renderChecklist();

    // Dependencies selector
    this.renderDependenciesSelector(task);

    this.modalEl.classList.add('active');
    document.getElementById('taskTitle').focus();
  }

  close() {
    this.modalEl.classList.remove('active');
    this.currentTaskId = null;
    this.checklistItems = [];
    if (this.form) this.form.reset();
  }

  renderChecklist() {
    const container = document.getElementById('checklistItemsContainer');
    if (!container) return;

    if (this.checklistItems.length === 0) {
      container.innerHTML = `<span style="font-size:0.8rem;color:var(--text-muted);padding:4px 0;">No checklist items yet.</span>`;
      return;
    }

    container.innerHTML = this.checklistItems.map((item, idx) => `
      <div class="checklist-item-row ${item.completed ? 'completed' : ''}">
        <input type="checkbox" ${item.completed ? 'checked' : ''} data-checklist-idx="${idx}" />
        <span class="checklist-item-text">${item.text}</span>
        <button type="button" class="checklist-item-delete" data-delete-idx="${idx}" title="Remove item">×</button>
      </div>
    `).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-checklist-idx'), 10);
        this.checklistItems[idx].completed = e.target.checked;
        this.renderChecklist();
      });
    });

    container.querySelectorAll('[data-delete-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-delete-idx'), 10);
        this.checklistItems.splice(idx, 1);
        this.renderChecklist();
      });
    });
  }

  renderDependenciesSelector(currentTask) {
    const container = document.getElementById('taskDependenciesContainer');
    if (!container) return;

    const availableTasks = AppState.tasks.filter(t => !currentTask || t.id !== currentTask.id);
    if (availableTasks.length === 0) {
      container.innerHTML = `<span style="font-size:0.8rem;color:var(--text-muted);">No other tasks available for dependencies.</span>`;
      return;
    }

    const currentDeps = new Set(currentTask && currentTask.dependencies ? currentTask.dependencies : []);

    container.innerHTML = availableTasks.map(t => `
      <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.82rem;cursor:pointer;">
        <input type="checkbox" value="${t.id}" name="dependencies" ${currentDeps.has(t.id) ? 'checked' : ''} />
        <span>${t.title}</span>
      </label>
    `).join('');
  }

  async handleSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    if (!title) return;

    const isMilestone = document.getElementById('taskIsMilestone').checked;
    const startDate = document.getElementById('taskStartDate').value;
    let endDate = document.getElementById('taskEndDate').value;
    if (isMilestone || !endDate) {
      endDate = startDate;
    }

    // Collect selected dependencies
    const depCheckboxes = document.querySelectorAll('input[name="dependencies"]:checked');
    const dependencies = Array.from(depCheckboxes).map(cb => cb.value);

    const taskPayload = {
      title,
      category: document.getElementById('taskCategory').value.trim() || 'General',
      start_date: startDate,
      end_date: endDate,
      is_milestone: isMilestone,
      status: document.getElementById('taskStatus').value,
      progress: parseInt(document.getElementById('taskProgress').value, 10) || 0,
      assignee: document.getElementById('taskAssignee').value,
      priority: document.getElementById('taskPriority').value,
      notes: document.getElementById('taskNotes').value.trim(),
      checklist: this.checklistItems,
      dependencies,
      updated_by: AppState.getActiveUserName()
    };

    try {
      if (this.currentTaskId) {
        const updated = await API.updateTask(this.currentTaskId, taskPayload);
        const nextTasks = AppState.tasks.map(t => t.id === updated.id ? updated : t);
        AppState.setTasks(nextTasks);
        showToast('Task updated successfully!', 'success');
      } else {
        taskPayload.created_by = AppState.getActiveUserName();
        const created = await API.createTask(taskPayload);
        AppState.setTasks([...AppState.tasks, created]);
        showToast('Task created!', 'success');
      }
      this.close();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async handleDelete() {
    if (!this.currentTaskId) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await API.deleteTask(this.currentTaskId);
      const nextTasks = AppState.tasks.filter(t => t.id !== this.currentTaskId);
      AppState.setTasks(nextTasks);
      showToast('Task deleted.', 'success');
      this.close();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}
