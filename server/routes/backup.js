const express = require('express');
const { requireAuth } = require('../auth');
const { db, getAllSettings, setSetting } = require('../db');

const router = express.Router();

router.use(requireAuth);

// Export full backup JSON
router.get('/export', (req, res) => {
  try {
    const settings = getAllSettings();
    delete settings.password_hash;

    const tasksRows = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC').all();
    const tasks = tasksRows.map(row => ({
      ...row,
      is_milestone: Boolean(row.is_milestone),
      checklist: row.checklist ? JSON.parse(row.checklist) : [],
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : []
    }));

    const backupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      settings,
      tasks
    };

    const filename = `wedding-gantt-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Restore from full backup JSON
router.post('/restore', (req, res) => {
  try {
    const { settings, tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Invalid backup file format: tasks array missing.' });
    }

    // Restore settings
    if (settings && typeof settings === 'object') {
      for (const [key, val] of Object.entries(settings)) {
        if (key !== 'password_hash') {
          setSetting(key, String(val));
        }
      }
    }

    // Replace tasks
    db.prepare('DELETE FROM tasks').run();

    const insertStmt = db.prepare(`
      INSERT INTO tasks (
        id, title, category, start_date, end_date, is_milestone,
        status, progress, assignee, priority, estimated_cost, actual_cost,
        notes, checklist, dependencies, sort_order, created_by, updated_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of tasks) {
      insertStmt.run(
        t.id,
        t.title,
        t.category || 'General',
        t.start_date,
        t.end_date,
        t.is_milestone ? 1 : 0,
        t.status || 'todo',
        t.progress || 0,
        t.assignee || 'both',
        t.priority || 'medium',
        t.estimated_cost || 0,
        t.actual_cost || 0,
        t.notes || '',
        JSON.stringify(t.checklist || []),
        JSON.stringify(t.dependencies || []),
        t.sort_order || 0,
        t.created_by || 'Alex',
        t.updated_by || 'Alex',
        t.created_at || new Date().toISOString(),
        t.updated_at || new Date().toISOString()
      );
    }

    res.json({ success: true, count: tasks.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Export CSV
router.get('/csv', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC').all();

    const headers = [
      'Title',
      'Category',
      'Start Date',
      'End Date',
      'Milestone',
      'Status',
      'Progress %',
      'Assignee',
      'Priority',
      'Notes'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.join(',')];
    for (const t of tasks) {
      csvLines.push([
        escapeCsv(t.title),
        escapeCsv(t.category),
        escapeCsv(t.start_date),
        escapeCsv(t.end_date),
        escapeCsv(t.is_milestone ? 'Yes' : 'No'),
        escapeCsv(t.status),
        escapeCsv(t.progress),
        escapeCsv(t.assignee),
        escapeCsv(t.priority),
        escapeCsv(t.notes)
      ].join(','));
    }

    const filename = `wedding-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvLines.join('\n'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
