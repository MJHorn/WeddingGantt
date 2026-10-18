const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../auth');
const { db } = require('../db');

const router = express.Router();

router.use(requireAuth);

function parseTaskRow(row) {
  if (!row) return null;
  return {
    ...row,
    is_milestone: Boolean(row.is_milestone),
    progress: Number(row.progress) || 0,
    estimated_cost: Number(row.estimated_cost) || 0,
    actual_cost: Number(row.actual_cost) || 0,
    sort_order: Number(row.sort_order) || 0,
    checklist: row.checklist ? JSON.parse(row.checklist) : [],
    dependencies: row.dependencies ? JSON.parse(row.dependencies) : []
  };
}

// Get all tasks
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC, start_date ASC').all();
    const tasks = rows.map(parseTaskRow);
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a task
router.post('/', (req, res) => {
  try {
    const {
      title,
      category = 'General',
      start_date,
      end_date,
      is_milestone = false,
      status = 'todo',
      progress = 0,
      assignee = 'both',
      priority = 'medium',
      estimated_cost = 0,
      actual_cost = 0,
      notes = '',
      checklist = [],
      dependencies = [],
      created_by = 'Alex'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const finalStart = start_date || todayStr;
    const finalEnd = end_date || finalStart;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get max sort_order
    const maxOrderRow = db.prepare('SELECT MAX(sort_order) as max_order FROM tasks').get();
    const sort_order = (maxOrderRow && maxOrderRow.max_order !== null) ? maxOrderRow.max_order + 10 : 10;

    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, title, category, start_date, end_date, is_milestone,
        status, progress, assignee, priority, estimated_cost, actual_cost,
        notes, checklist, dependencies, sort_order, created_by, updated_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      title.trim(),
      category.trim() || 'General',
      finalStart,
      finalEnd,
      is_milestone ? 1 : 0,
      status,
      Number(progress) || 0,
      assignee,
      priority,
      Number(estimated_cost) || 0,
      Number(actual_cost) || 0,
      notes || '',
      JSON.stringify(checklist || []),
      JSON.stringify(dependencies || []),
      sort_order,
      created_by || 'Alex',
      created_by || 'Alex',
      now,
      now
    );

    const createdRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json(parseTaskRow(createdRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a task
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const current = parseTaskRow(existing);
    const updates = req.body;
    const now = new Date().toISOString();

    const title = updates.title !== undefined ? updates.title.trim() : current.title;
    const category = updates.category !== undefined ? updates.category.trim() : current.category;
    const start_date = updates.start_date !== undefined ? updates.start_date : current.start_date;
    const end_date = updates.end_date !== undefined ? updates.end_date : current.end_date;
    const is_milestone = updates.is_milestone !== undefined ? (updates.is_milestone ? 1 : 0) : existing.is_milestone;
    const status = updates.status !== undefined ? updates.status : current.status;
    const progress = updates.progress !== undefined ? Number(updates.progress) : current.progress;
    const assignee = updates.assignee !== undefined ? updates.assignee : current.assignee;
    const priority = updates.priority !== undefined ? updates.priority : current.priority;
    const estimated_cost = updates.estimated_cost !== undefined ? Number(updates.estimated_cost) : current.estimated_cost;
    const actual_cost = updates.actual_cost !== undefined ? Number(updates.actual_cost) : current.actual_cost;
    const notes = updates.notes !== undefined ? updates.notes : current.notes;
    const checklist = updates.checklist !== undefined ? JSON.stringify(updates.checklist) : existing.checklist;
    const dependencies = updates.dependencies !== undefined ? JSON.stringify(updates.dependencies) : existing.dependencies;
    const sort_order = updates.sort_order !== undefined ? Number(updates.sort_order) : current.sort_order;
    const updated_by = updates.updated_by || current.updated_by;

    const stmt = db.prepare(`
      UPDATE tasks SET
        title = ?, category = ?, start_date = ?, end_date = ?, is_milestone = ?,
        status = ?, progress = ?, assignee = ?, priority = ?, estimated_cost = ?,
        actual_cost = ?, notes = ?, checklist = ?, dependencies = ?, sort_order = ?,
        updated_by = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      title,
      category,
      start_date,
      end_date,
      is_milestone,
      status,
      progress,
      assignee,
      priority,
      estimated_cost,
      actual_cost,
      notes,
      checklist,
      dependencies,
      sort_order,
      updated_by,
      now,
      id
    );

    const updatedRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(parseTaskRow(updatedRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a task
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    // Also remove this task id from any dependencies array
    const allTasks = db.prepare('SELECT id, dependencies FROM tasks').all();
    for (const t of allTasks) {
      if (t.dependencies && t.dependencies.includes(id)) {
        try {
          const deps = JSON.parse(t.dependencies).filter(d => d !== id);
          db.prepare('UPDATE tasks SET dependencies = ? WHERE id = ?').run(JSON.stringify(deps), t.id);
        } catch (err) {
          // Ignore json parse err
        }
      }
    }

    res.json({ success: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reorder tasks
router.post('/reorder', (req, res) => {
  try {
    const { orderedIds, items } = req.body;
    if (Array.isArray(items)) {
      const stmt = db.prepare('UPDATE tasks SET sort_order = ?, category = COALESCE(?, category) WHERE id = ?');
      const updateBatch = db.transaction((list) => {
        list.forEach((item, index) => {
          const cat = item.category !== undefined ? item.category : null;
          const order = item.sort_order !== undefined ? item.sort_order : index * 10;
          stmt.run(order, cat, item.id);
        });
      });
      updateBatch(items);
      return res.json({ success: true });
    }

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds or items must be an array.' });
    }

    const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?');
    const updateBatch = db.transaction((ids) => {
      ids.forEach((id, index) => {
        stmt.run(index * 10, id);
      });
    });
    updateBatch(orderedIds);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Clear all tasks
router.post('/clear', (req, res) => {
  try {
    db.prepare('DELETE FROM tasks').run();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Load template tasks
router.post('/template', (req, res) => {
  try {
    const { tasks, clearExisting = false, updated_by = 'Alex' } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Valid template tasks array is required.' });
    }

    if (clearExisting) {
      db.prepare('DELETE FROM tasks').run();
    }

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO tasks (
        id, title, category, start_date, end_date, is_milestone,
        status, progress, assignee, priority, estimated_cost, actual_cost,
        notes, checklist, dependencies, sort_order, created_by, updated_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Map old id to new id to preserve internal dependency links
    const idMap = {};
    tasks.forEach(t => {
      idMap[t.id || t._tempId] = crypto.randomUUID();
    });

    tasks.forEach((t, index) => {
      const newId = idMap[t.id || t._tempId] || crypto.randomUUID();
      const mappedDeps = (t.dependencies || []).map(depId => idMap[depId] || depId);

      insertStmt.run(
        newId,
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
        JSON.stringify(mappedDeps),
        (index + 1) * 10,
        updated_by,
        updated_by,
        now,
        now
      );
    });

    const rows = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC, start_date ASC').all();
    res.json(rows.map(parseTaskRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
