const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { DB_PATH } = require('./db');

const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const tasksRoutes = require('./routes/tasks');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// Body & Cookie parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Coolify / Container Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/backup', backupRoutes);

// Static assets
app.use(express.static(path.join(__dirname, '../public')));

// SPA Fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`💍 Wedding Gantt App listening on http://0.0.0.0:${PORT}`);
  console.log(`📁 Database path: ${DB_PATH}`);
});
