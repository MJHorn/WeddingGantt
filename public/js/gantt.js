// Interactive Gantt Chart Engine
class GanttChart {
  constructor(containerEl) {
    this.container = containerEl;
    this.collapsedCategories = new Set();
    this.columnWidth = 36; // px per unit
    this.rowHeight = 44; // px per row
    this.startDate = null;
    this.endDate = null;
    this.datesList = [];
    this.dragState = null;

    this.onRowClick = null;
    this.onTaskChange = null;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  setCallbacks({ onRowClick, onTaskChange, onReorderTasks }) {
    this.onRowClick = onRowClick;
    this.onTaskChange = onTaskChange;
    this.onReorderTasks = onReorderTasks;
  }

  // Calculate timeline date range based on tasks, today, and wedding date
  computeDateRange(tasks, weddingDateStr) {
    let minTime = Infinity;
    let maxTime = -Infinity;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    minTime = Math.min(minTime, today.getTime());
    maxTime = Math.max(maxTime, today.getTime());

    if (weddingDateStr) {
      const wDate = new Date(weddingDateStr);
      wDate.setHours(0, 0, 0, 0);
      minTime = Math.min(minTime, wDate.getTime());
      maxTime = Math.max(maxTime, wDate.getTime());
    }

    for (const t of tasks) {
      const s = new Date(t.start_date).getTime();
      const e = new Date(t.end_date).getTime();
      if (!isNaN(s)) minTime = Math.min(minTime, s);
      if (!isNaN(e)) maxTime = Math.max(maxTime, e);
    }

    // Default padding: 14 days before min, 30 days after max
    const start = new Date(minTime);
    start.setDate(start.getDate() - 14);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxTime);
    end.setDate(end.getDate() + 30);
    end.setHours(0, 0, 0, 0);

    this.startDate = start;
    this.endDate = end;

    // Days view: 40px column width per day
    this.columnWidth = 40;
    this.generateDateUnits();
  }

  generateDateUnits() {
    this.dateUnits = [];
    const current = new Date(this.startDate);
    while (current <= this.endDate) {
      this.dateUnits.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  }

  // Convert Date to X coordinate in pixels
  dateToX(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const startTime = this.startDate.getTime();
    const targetTime = d.getTime();
    const days = (targetTime - startTime) / (1000 * 60 * 60 * 24);
    return days * this.columnWidth;
  }

  // Convert X pixel coordinate back to Date string (YYYY-MM-DD)
  xToDate(x) {
    const startTime = this.startDate.getTime();
    const days = Math.round(x / this.columnWidth);
    const targetTime = startTime + days * 24 * 60 * 60 * 1000;
    const res = new Date(targetTime);
    return res.toISOString().split('T')[0];
  }

  render(tasks, weddingDateStr) {
    if (!this.container) return;

    if (tasks.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.computeDateRange(tasks, weddingDateStr);

    // Group tasks by category
    const categoriesMap = new Map();
    for (const t of tasks) {
      const cat = t.category || 'General';
      if (!categoriesMap.has(cat)) {
        categoriesMap.set(cat, []);
      }
      categoriesMap.get(cat).push(t);
    }

    // Build visible rows
    this.visibleRows = [];
    for (const [catName, catTasks] of categoriesMap.entries()) {
      const isCollapsed = this.collapsedCategories.has(catName);
      this.visibleRows.push({ type: 'category', title: catName, count: catTasks.length, isCollapsed });
      if (!isCollapsed) {
        for (const t of catTasks) {
          this.visibleRows.push({ type: 'task', task: t });
        }
      }
    }

    const totalWidth = this.dateUnits.length * this.columnWidth;
    const totalHeight = this.visibleRows.length * this.rowHeight;

    // Preserve scroll coordinates across re-renders
    const existingSidebar = document.getElementById('ganttSidebarBody');
    const existingTimelineBody = document.getElementById('ganttTimelineBodyContainer');
    const savedScrollTop = existingTimelineBody ? existingTimelineBody.scrollTop : (existingSidebar ? existingSidebar.scrollTop : (this.lastScrollTop !== undefined ? this.lastScrollTop : null));
    const savedScrollLeft = existingTimelineBody ? existingTimelineBody.scrollLeft : (this.lastScrollLeft !== undefined ? this.lastScrollLeft : null);

    this.container.innerHTML = `
      <div class="gantt-wrapper">
        <!-- Sidebar -->
        <div class="gantt-sidebar" id="ganttSidebar">
          <div class="gantt-sidebar-header">
            <span>Tasks & Milestones (${tasks.length})</span>
            <button class="btn btn-secondary" id="ganttCollapseAllBtn" style="padding: 2px 8px; font-size: 0.72rem;">
              Toggle All
            </button>
          </div>
          <div class="gantt-sidebar-body" id="ganttSidebarBody">
            ${this.renderSidebarRows()}
            <div style="height: 36px;"></div>
          </div>
        </div>

        <!-- Resizer -->
        <div class="gantt-resizer" id="ganttResizer"></div>

        <!-- Timeline Panel -->
        <div class="gantt-timeline-panel" id="ganttTimelinePanel">
          <!-- Fixed Horizontal Header -->
          <div class="gantt-timeline-header-container" id="ganttTimelineHeaderContainer">
            <div class="gantt-timeline-header-inner" style="width: ${totalWidth}px;">
              ${this.renderTimelineHeader()}
            </div>
          </div>

          <!-- Synchronized Scrollable Timeline Body -->
          <div class="gantt-timeline-body-container" id="ganttTimelineBodyContainer">
            <div class="gantt-timeline-body" id="ganttTimelineBody" style="width: ${totalWidth}px; height: ${totalHeight}px;">
              ${this.renderGridColumns(totalHeight)}
              ${this.renderMarkers(weddingDateStr, totalHeight)}
              <svg class="gantt-dependency-svg" id="ganttDependencySvg" style="width: ${totalWidth}px; height: ${totalHeight}px;"></svg>
              <div class="gantt-bars-layer">
                ${this.renderTimelineRows()}
              </div>
            </div>
            <div style="height: 36px;"></div>
          </div>
        </div>
      </div>
    `;

    this.attachDomHandlers();
    this.drawDependencies();

    if (savedScrollLeft !== null) {
      const newTimelineBody = document.getElementById('ganttTimelineBodyContainer');
      const newTimelineHeader = document.getElementById('ganttTimelineHeaderContainer');
      const newSidebar = document.getElementById('ganttSidebarBody');
      if (newTimelineBody) {
        newTimelineBody.scrollLeft = savedScrollLeft;
        newTimelineBody.scrollTop = savedScrollTop || 0;
      }
      if (newTimelineHeader) {
        newTimelineHeader.scrollLeft = savedScrollLeft;
      }
      if (newSidebar) {
        newSidebar.scrollTop = savedScrollTop || 0;
      }
    } else {
      this.scrollToToday();
    }
  }

  renderEmptyState() {
    this.container.innerHTML = `
      <div class="empty-state-container">
        <div class="empty-state-badge">💍</div>
        <h2 class="empty-state-title">Welcome to Your Wedding Planner</h2>
        <p class="empty-state-desc">
          Start plotting out your dream wedding timeline together. Add your first custom task or milestone to begin!
        </p>
        <div class="empty-state-actions">
          <button class="btn btn-primary" id="emptyStateAddTaskBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add First Task
          </button>
        </div>
      </div>
    `;

    const addBtn = document.getElementById('emptyStateAddTaskBtn');
    if (addBtn) addBtn.onclick = () => window.dispatchEvent(new CustomEvent('open-task-modal'));
  }

  renderSidebarRows() {
    return this.visibleRows.map((row, index) => {
      if (row.type === 'category') {
        const catColor = AppState.getCategoryColor(row.title);
        return `
          <div class="gantt-row gantt-row-category" data-category="${row.title}" style="height: ${this.rowHeight}px;">
            <div class="sidebar-row-content">
              <div class="category-drag-handle" draggable="true" title="Drag to reorder category">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                  <circle cx="2" cy="2" r="1.2"/>
                  <circle cx="6" cy="2" r="1.2"/>
                  <circle cx="2" cy="6" r="1.2"/>
                  <circle cx="6" cy="6" r="1.2"/>
                  <circle cx="2" cy="10" r="1.2"/>
                  <circle cx="6" cy="10" r="1.2"/>
                </svg>
              </div>
              <span class="category-toggle-icon ${row.isCollapsed ? 'collapsed' : ''}">▼</span>
              <span class="category-color-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${catColor.primary};margin-right:0.45rem;flex-shrink:0;"></span>
              <span style="flex:1;font-weight:600;">${row.title}</span>
              <span class="kanban-column-count" style="background:${catColor.lightBg};color:${catColor.text};border:1px solid ${catColor.border};font-weight:600;">${row.count}</span>
            </div>
          </div>
        `;
      }

      const t = row.task;
      const isDone = t.status === 'done';
      const assigneeKey = t.assignee || 'both';
      const assigneeInitial = assigneeKey === 'partner1'
        ? (AppState.settings.partner1_name || 'P1')[0]
        : assigneeKey === 'partner2'
        ? (AppState.settings.partner2_name || 'P2')[0]
        : assigneeKey === 'both' ? '♥' : '?';

      return `
        <div class="gantt-row" data-task-id="${t.id}" style="height: ${this.rowHeight}px;">
          <div class="sidebar-row-content">
            <div class="task-drag-handle" draggable="true" title="Drag to reorder task">
              <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                <circle cx="2" cy="2" r="1.2"/>
                <circle cx="6" cy="2" r="1.2"/>
                <circle cx="2" cy="6" r="1.2"/>
                <circle cx="6" cy="6" r="1.2"/>
                <circle cx="2" cy="10" r="1.2"/>
                <circle cx="6" cy="10" r="1.2"/>
              </svg>
            </div>
            <div class="task-checkbox ${isDone ? 'completed' : ''}" data-action="toggle-complete" title="Mark done">
              ${isDone ? '✓' : ''}
            </div>
            <div class="assignee-badge ${assigneeKey}" title="Assigned to ${AppState.getPartnerName(assigneeKey)}">
              ${assigneeInitial}
            </div>
            <div class="sidebar-task-title ${isDone ? 'completed' : ''}" data-action="edit-task" title="${t.title}">
              ${t.title}
            </div>
            <div class="task-row-actions">
              <button class="btn-icon" data-action="edit-task" style="width:24px;height:24px;padding:2px;" title="Edit">
                ✎
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTimelineHeader() {
    const topCells = [];
    const bottomCells = [];

    let currentMonthStr = '';
    let monthWidth = 0;

    this.dateUnits.forEach((d) => {
      const mStr = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      if (mStr !== currentMonthStr) {
        if (currentMonthStr) {
          topCells.push(`<div class="scale-cell" style="width: ${monthWidth}px;">${currentMonthStr}</div>`);
        }
        currentMonthStr = mStr;
        monthWidth = this.columnWidth;
      } else {
        monthWidth += this.columnWidth;
      }

      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
      bottomCells.push(`
        <div class="scale-cell ${isWeekend ? 'weekend' : ''}" style="width: ${this.columnWidth}px;" title="${d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}">
          <span class="day-letter">${dayLetter}</span><span class="day-num">${d.getDate()}</span>
        </div>
      `);
    });

    if (currentMonthStr) {
      topCells.push(`<div class="scale-cell" style="width: ${monthWidth}px;">${currentMonthStr}</div>`);
    }

    return `
      <div class="gantt-timeline-scale-primary">${topCells.join('')}</div>
      <div class="gantt-timeline-scale-secondary">${bottomCells.join('')}</div>
    `;
  }

  renderGridColumns(totalHeight) {
    const cols = this.dateUnits.map((d) => {
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      return `<div class="gantt-grid-col ${isWeekend ? 'weekend' : ''}" style="width: ${this.columnWidth}px;" title="${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}"></div>`;
    });
    return `<div class="gantt-grid-columns" style="height: ${totalHeight}px;">${cols.join('')}</div>`;
  }

  renderMarkers(weddingDateStr, totalHeight) {
    const markers = [];

    // Today Marker
    const todayStr = new Date().toISOString().split('T')[0];
    const todayX = this.dateToX(todayStr);
    if (todayX >= 0) {
      markers.push(`
        <div class="gantt-marker-line gantt-marker-today" style="left: ${todayX}px; height: ${totalHeight}px;">
          <span class="marker-label">Today</span>
        </div>
      `);
    }

    // Wedding Day Marker
    if (weddingDateStr) {
      const wX = this.dateToX(weddingDateStr);
      if (wX >= 0) {
        markers.push(`
          <div class="gantt-marker-line gantt-marker-wedding" style="left: ${wX}px; height: ${totalHeight}px;">
            <span class="marker-label">💍 Wedding Day!</span>
          </div>
        `);
      }
    }

    return markers.join('');
  }

  renderTimelineRows() {
    return this.visibleRows.map((row, index) => {
      const top = index * this.rowHeight;

      if (row.type === 'category') {
        return `<div class="gantt-row gantt-row-category" style="position: absolute; top: ${top}px; left: 0; right: 0; height: ${this.rowHeight}px;"></div>`;
      }

      const t = row.task;
      const catColor = AppState.getCategoryColor(t.category);
      const startX = this.dateToX(t.start_date);
      const endX = this.dateToX(t.end_date);
      const barWidth = Math.max(endX - startX + (AppState.zoom === 'days' ? this.columnWidth : 20), 24);

      if (t.is_milestone) {
        return `
          <div class="gantt-row" data-task-id="${t.id}" style="position: absolute; top: ${top}px; left: 0; right: 0; height: ${this.rowHeight}px;">
            <div class="gantt-milestone-marker" data-task-id="${t.id}" style="left: ${startX}px; background: ${catColor.gradient}; box-shadow: 0 2px 10px ${catColor.primary}70;" title="${t.title} (${t.start_date}) • ${t.category}">
            </div>
            <span class="milestone-label-text" style="left: ${startX + 14}px;">${t.title}</span>
          </div>
        `;
      }

      const statusClass = t.status === 'done' ? 'status-done' : '';
      const progressPercent = Math.min(Math.max(t.progress || 0, 0), 100);

      return `
        <div class="gantt-row" data-task-id="${t.id}" style="position: absolute; top: ${top}px; left: 0; right: 0; height: ${this.rowHeight}px;">
          <div class="gantt-task-bar ${statusClass}"
               data-task-id="${t.id}"
               style="left: ${startX}px; width: ${barWidth}px; background: ${catColor.gradient}; box-shadow: 0 2px 8px ${catColor.primary}40;"
               title="${t.title} (${t.start_date} to ${t.end_date}) • ${t.category}">
            <div class="task-bar-progress" style="width: ${progressPercent}%;"></div>
            <div class="resize-handle resize-handle-left" data-action="resize-left"></div>
            <div class="task-bar-content">
              <span>${t.title}</span>
            </div>
            <div class="resize-handle resize-handle-right" data-action="resize-right"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  attachDomHandlers() {
    // Synchronize scrolling between sidebar and timeline without feedback loops
    const sidebar = document.getElementById('ganttSidebarBody');
    const timelineBody = document.getElementById('ganttTimelineBodyContainer');
    const timelineHeader = document.getElementById('ganttTimelineHeaderContainer');

    if (sidebar && timelineBody) {
      let scrollDriver = null;
      let rAF = null;

      sidebar.addEventListener('scroll', () => {
        this.lastScrollTop = sidebar.scrollTop;
        if (scrollDriver === timelineBody) return;
        scrollDriver = sidebar;
        timelineBody.scrollTop = sidebar.scrollTop;
        if (rAF) cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          scrollDriver = null;
        });
      }, { passive: true });

      timelineBody.addEventListener('scroll', () => {
        this.lastScrollTop = timelineBody.scrollTop;
        this.lastScrollLeft = timelineBody.scrollLeft;

        // Keep horizontal date header locked with timeline body
        if (timelineHeader) {
          timelineHeader.scrollLeft = timelineBody.scrollLeft;
        }

        if (scrollDriver === sidebar) return;
        scrollDriver = timelineBody;
        sidebar.scrollTop = timelineBody.scrollTop;
        if (rAF) cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          scrollDriver = null;
        });
      }, { passive: true });
    }

    // Synchronize hover highlighting between sidebar rows and timeline rows
    this.container.addEventListener('mouseover', (e) => {
      const row = e.target.closest('.gantt-row[data-task-id]');
      if (row) {
        const taskId = row.getAttribute('data-task-id');
        const matches = this.container.querySelectorAll(`.gantt-row[data-task-id="${taskId}"]`);
        matches.forEach(el => el.classList.add('hovered'));
      }
    });

    this.container.addEventListener('mouseout', (e) => {
      const row = e.target.closest('.gantt-row[data-task-id]');
      if (row) {
        const taskId = row.getAttribute('data-task-id');
        const matches = this.container.querySelectorAll(`.gantt-row[data-task-id="${taskId}"]`);
        matches.forEach(el => el.classList.remove('hovered'));
      }
    });

    // Category folding
    const catRows = this.container.querySelectorAll('.gantt-row-category[data-category]');
    catRows.forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.category-drag-handle')) return;
        const cat = el.getAttribute('data-category');
        if (this.collapsedCategories.has(cat)) {
          this.collapsedCategories.delete(cat);
        } else {
          this.collapsedCategories.add(cat);
        }
        this.render(AppState.getFilteredTasks(), AppState.settings.wedding_date);
      });
    });

    // Drag-and-drop reordering for Tasks and Categories in the sidebar
    const sidebarBody = document.getElementById('ganttSidebarBody');
    if (sidebarBody) {
      let draggedType = null;
      let draggedId = null;
      let draggedRowEl = null;

      const clearDropIndicators = () => {
        sidebarBody.querySelectorAll('.gantt-row').forEach(r => {
          r.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-category', 'dragging');
        });
      };

      // Task Drag Handle Listeners
      sidebarBody.querySelectorAll('.task-drag-handle').forEach(handle => {
        handle.addEventListener('dragstart', (e) => {
          const row = handle.closest('.gantt-row[data-task-id]');
          if (!row) return;
          draggedType = 'task';
          draggedId = row.getAttribute('data-task-id');
          draggedRowEl = row;
          row.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', draggedId);
        });
      });

      // Category Drag Handle Listeners
      sidebarBody.querySelectorAll('.category-drag-handle').forEach(handle => {
        handle.addEventListener('dragstart', (e) => {
          const row = handle.closest('.gantt-row-category[data-category]');
          if (!row) return;
          draggedType = 'category';
          draggedId = row.getAttribute('data-category');
          draggedRowEl = row;
          row.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', draggedId);
        });
      });

      sidebarBody.addEventListener('dragover', (e) => {
        if (!draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const targetRow = e.target.closest('.gantt-row');
        if (!targetRow || targetRow === draggedRowEl) {
          sidebarBody.querySelectorAll('.gantt-row').forEach(r => {
            if (r !== draggedRowEl) r.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-category');
          });
          return;
        }

        const rect = targetRow.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const isTop = relY < rect.height / 2;

        sidebarBody.querySelectorAll('.gantt-row').forEach(r => {
          if (r !== targetRow && r !== draggedRowEl) {
            r.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-category');
          }
        });

        if (draggedType === 'task') {
          if (targetRow.classList.contains('gantt-row-category')) {
            targetRow.classList.add('drag-over-category');
            targetRow.classList.remove('drag-over-top', 'drag-over-bottom');
          } else {
            targetRow.classList.remove('drag-over-category');
            targetRow.classList.toggle('drag-over-top', isTop);
            targetRow.classList.toggle('drag-over-bottom', !isTop);
          }
        } else if (draggedType === 'category') {
          if (targetRow.classList.contains('gantt-row-category')) {
            targetRow.classList.toggle('drag-over-top', isTop);
            targetRow.classList.toggle('drag-over-bottom', !isTop);
          }
        }
      });

      sidebarBody.addEventListener('dragend', () => {
        clearDropIndicators();
        draggedType = null;
        draggedId = null;
        draggedRowEl = null;
      });

      sidebarBody.addEventListener('drop', (e) => {
        if (!draggedId) return;
        e.preventDefault();

        const targetRow = e.target.closest('.gantt-row');
        if (!targetRow || targetRow === draggedRowEl) {
          clearDropIndicators();
          return;
        }

        const rect = targetRow.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const isTop = relY < rect.height / 2;
        const allTasks = [...AppState.tasks];

        if (draggedType === 'task') {
          const draggedTask = allTasks.find(t => t.id === draggedId);
          if (!draggedTask) {
            clearDropIndicators();
            return;
          }

          if (targetRow.classList.contains('gantt-row-category')) {
            // Dropped onto category header -> place at the beginning of that category
            const targetCat = targetRow.getAttribute('data-category');
            draggedTask.category = targetCat;

            const remaining = allTasks.filter(t => t.id !== draggedId);
            const firstInCat = remaining.findIndex(t => (t.category || 'General') === targetCat);
            const insertIdx = firstInCat !== -1 ? firstInCat : remaining.length;
            remaining.splice(insertIdx, 0, draggedTask);

            remaining.forEach((t, i) => { t.sort_order = i * 10; });
            clearDropIndicators();
            if (this.onReorderTasks) this.onReorderTasks(remaining);
          } else {
            // Dropped onto another task row
            const targetTaskId = targetRow.getAttribute('data-task-id');
            const targetTask = allTasks.find(t => t.id === targetTaskId);
            if (!targetTask) {
              clearDropIndicators();
              return;
            }

            // Adopt target task's category
            draggedTask.category = targetTask.category;

            const remaining = allTasks.filter(t => t.id !== draggedId);
            const targetIdx = remaining.findIndex(t => t.id === targetTaskId);
            const insertIdx = isTop ? targetIdx : targetIdx + 1;
            remaining.splice(insertIdx, 0, draggedTask);

            remaining.forEach((t, i) => { t.sort_order = i * 10; });
            clearDropIndicators();
            if (this.onReorderTasks) this.onReorderTasks(remaining);
          }
        } else if (draggedType === 'category') {
          // Reorder entire category
          if (targetRow.classList.contains('gantt-row-category')) {
            const targetCat = targetRow.getAttribute('data-category');
            if (targetCat && targetCat !== draggedId) {
              const catTasks = allTasks.filter(t => (t.category || 'General') === draggedId);
              const otherTasks = allTasks.filter(t => (t.category || 'General') !== draggedId);

              let insertIdx = otherTasks.findIndex(t => (t.category || 'General') === targetCat);
              if (!isTop) {
                let targetLastIdx = -1;
                for (let i = otherTasks.length - 1; i >= 0; i--) {
                  if ((otherTasks[i].category || 'General') === targetCat) {
                    targetLastIdx = i;
                    break;
                  }
                }
                insertIdx = targetLastIdx !== -1 ? targetLastIdx + 1 : otherTasks.length;
              }
              if (insertIdx === -1) insertIdx = otherTasks.length;

              otherTasks.splice(insertIdx, 0, ...catTasks);
              otherTasks.forEach((t, i) => { t.sort_order = i * 10; });
              clearDropIndicators();
              if (this.onReorderTasks) this.onReorderTasks(otherTasks);
            }
          }
        }

        clearDropIndicators();
      });
    }

    const collapseAllBtn = document.getElementById('ganttCollapseAllBtn');
    if (collapseAllBtn) {
      collapseAllBtn.onclick = () => {
        const categories = AppState.getCategories();
        if (this.collapsedCategories.size === categories.length) {
          this.collapsedCategories.clear();
        } else {
          categories.forEach(c => this.collapsedCategories.add(c));
        }
        this.render(AppState.getFilteredTasks(), AppState.settings.wedding_date);
      };
    }

    // Resizer between sidebar and timeline
    const resizer = document.getElementById('ganttResizer');
    const sidebarEl = document.getElementById('ganttSidebar');
    if (resizer && sidebarEl) {
      let isResizing = false;
      resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = Math.max(260, Math.min(600, e.clientX));
        sidebarEl.style.width = `${newWidth}px`;
      });
      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          resizer.classList.remove('active');
          document.body.style.cursor = '';
        }
      });
    }

    // Row clicks & Task actions
    this.container.addEventListener('click', (e) => {
      const toggleCheck = e.target.closest('[data-action="toggle-complete"]');
      if (toggleCheck) {
        const row = toggleCheck.closest('[data-task-id]');
        if (row) {
          const taskId = row.getAttribute('data-task-id');
          const task = AppState.tasks.find(t => t.id === taskId);
          if (task && this.onTaskChange) {
            const nextStatus = task.status === 'done' ? 'todo' : 'done';
            const nextProgress = nextStatus === 'done' ? 100 : 0;
            this.onTaskChange(taskId, { status: nextStatus, progress: nextProgress });
          }
        }
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-task"]');
      if (editBtn) {
        const row = editBtn.closest('[data-task-id]');
        if (row && this.onRowClick) {
          const taskId = row.getAttribute('data-task-id');
          const task = AppState.tasks.find(t => t.id === taskId);
          if (task) this.onRowClick(task);
        }
        return;
      }

      const milestoneMarker = e.target.closest('.gantt-milestone-marker');
      if (milestoneMarker && this.onRowClick) {
        const taskId = milestoneMarker.getAttribute('data-task-id');
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) this.onRowClick(task);
      }
    });

    // Drag-to-move and drag-to-resize task bars
    const taskBars = this.container.querySelectorAll('.gantt-task-bar');
    taskBars.forEach(bar => {
      bar.addEventListener('mousedown', (e) => {
        const taskId = bar.getAttribute('data-task-id');
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task) return;

        const isLeftHandle = e.target.classList.contains('resize-handle-left');
        const isRightHandle = e.target.classList.contains('resize-handle-right');

        this.dragState = {
          type: isLeftHandle ? 'resize-left' : isRightHandle ? 'resize-right' : 'move',
          taskId,
          task,
          startX: e.clientX,
          initialLeft: parseFloat(bar.style.left) || 0,
          initialWidth: parseFloat(bar.style.width) || 0,
          barEl: bar
        };

        this.showDragTooltip(e.clientX, e.clientY, task.start_date, task.end_date);
        e.preventDefault();
      });
    });
  }

  showDragTooltip(x, y, startDate, endDate) {
    let tip = document.getElementById('ganttDragTooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'ganttDragTooltip';
      tip.className = 'drag-date-tooltip';
      document.body.appendChild(tip);
    }
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.style.display = 'block';

    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    tip.textContent = `${startDate} → ${endDate} (${days} ${days === 1 ? 'day' : 'days'})`;
  }

  hideDragTooltip() {
    const tip = document.getElementById('ganttDragTooltip');
    if (tip) tip.style.display = 'none';
  }

  handleMouseMove(e) {
    if (!this.dragState) return;

    const { type, task, startX, initialLeft, initialWidth, barEl } = this.dragState;
    const deltaX = e.clientX - startX;

    if (type === 'move') {
      const newLeft = initialLeft + deltaX;
      barEl.style.left = `${newLeft}px`;

      const newStartDate = this.xToDate(newLeft);
      const originalDurationDays = (new Date(task.end_date) - new Date(task.start_date)) / (1000 * 60 * 60 * 24);
      const tempDate = new Date(newStartDate);
      tempDate.setDate(tempDate.getDate() + Math.max(0, originalDurationDays));
      const newEndDate = tempDate.toISOString().split('T')[0];

      this.dragState.currentStartDate = newStartDate;
      this.dragState.currentEndDate = newEndDate;
      this.showDragTooltip(e.clientX, e.clientY, newStartDate, newEndDate);
    } else if (type === 'resize-right') {
      const newWidth = Math.max(20, initialWidth + deltaX);
      barEl.style.width = `${newWidth}px`;

      const newEndDate = this.xToDate(initialLeft + newWidth);
      this.dragState.currentStartDate = task.start_date;
      this.dragState.currentEndDate = newEndDate;
      this.showDragTooltip(e.clientX, e.clientY, task.start_date, newEndDate);
    } else if (type === 'resize-left') {
      const newLeft = initialLeft + deltaX;
      const newWidth = Math.max(20, initialWidth - deltaX);
      barEl.style.left = `${newLeft}px`;
      barEl.style.width = `${newWidth}px`;

      const newStartDate = this.xToDate(newLeft);
      this.dragState.currentStartDate = newStartDate;
      this.dragState.currentEndDate = task.end_date;
      this.showDragTooltip(e.clientX, e.clientY, newStartDate, task.end_date);
    }
  }

  handleMouseUp(e) {
    if (!this.dragState) return;

    const { taskId, currentStartDate, currentEndDate } = this.dragState;
    this.hideDragTooltip();

    if (currentStartDate && currentEndDate && this.onTaskChange) {
      let finalStart = currentStartDate;
      let finalEnd = currentEndDate;
      if (new Date(finalStart) > new Date(finalEnd)) {
        finalEnd = finalStart;
      }
      this.onTaskChange(taskId, { start_date: finalStart, end_date: finalEnd });
    }

    this.dragState = null;
  }

  // Draw smooth SVG bezier curves connecting dependent tasks
  drawDependencies() {
    const svg = document.getElementById('ganttDependencySvg');
    if (!svg) return;

    svg.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" class="dependency-arrow" />
        </marker>
      </defs>
    `;

    // Map task id to row index and bounding box
    const taskCoords = new Map();
    this.visibleRows.forEach((row, idx) => {
      if (row.type === 'task') {
        const t = row.task;
        const startX = this.dateToX(t.start_date);
        const endX = this.dateToX(t.end_date) + (t.is_milestone ? 24 : Math.max(24, this.columnWidth));
        const centerY = idx * this.rowHeight + this.rowHeight / 2;
        taskCoords.set(t.id, { startX, endX, centerY });
      }
    });

    let pathsHtml = '';
    for (const row of this.visibleRows) {
      if (row.type === 'task' && row.task.dependencies && row.task.dependencies.length > 0) {
        const target = taskCoords.get(row.task.id);
        if (!target) continue;

        for (const depId of row.task.dependencies) {
          const source = taskCoords.get(depId);
          if (!source) continue;

          // Source endX to Target startX
          const p1 = { x: source.endX + 4, y: source.centerY };
          const p2 = { x: target.startX - 6, y: target.centerY };
          const midX = (p1.x + p2.x) / 2;

          const pathStr = `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
          pathsHtml += `<path d="${pathStr}" class="dependency-line" marker-end="url(#arrow)" />`;
        }
      }
    }

    svg.innerHTML += pathsHtml;
  }

  scrollToToday() {
    const timelineBody = document.getElementById('ganttTimelineBodyContainer');
    const timelineHeader = document.getElementById('ganttTimelineHeaderContainer');
    if (!timelineBody) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayX = this.dateToX(todayStr);
    if (todayX > 300) {
      const scrollPos = todayX - 200;
      timelineBody.scrollLeft = scrollPos;
      if (timelineHeader) timelineHeader.scrollLeft = scrollPos;
      this.lastScrollLeft = scrollPos;
    }
  }
}
