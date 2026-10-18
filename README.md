# 💍 Wedding Gantt Planner

A romantic, lightweight, self-hosted Gantt chart application designed specifically for couples planning their wedding together.

Built with **Node.js + Express**, native **SQLite**, and vanilla CSS/JS. Zero heavy database servers or complex frameworks required.

---

## ✨ Features

- **Interactive Daily Gantt Timeline**:
  - Drag tasks horizontally to adjust dates in real-time.
  - Drag side handles to lengthen or shorten task durations.
  - Days view with visually highlighted weekends and months header.
  - Visual dependency connectors (smooth SVG arrows from predecessor to successor tasks).
  - Milestone markers (diamond indicators).
  - Visual "Today" line and celebratory "💍 Wedding Day" countdown line.
- **Dynamic Category Color-Coding**:
  - Pick or type any custom category you want (e.g. *Venue, Music, Flowers, Rings, Ceremony*).
  - Automatically color-codes tasks, timeline bars, and category headers with vibrant, distinct palette colors.
  - Autocomplete suggests categories you have already created for easy reuse.
- **Made for Couples**:
  - Customizable partner names & theme colors in Settings (e.g. Alex & Sam).
  - Assign tasks to Partner 1, Partner 2, or Both together with partner initial badges.
  - Filter tasks quickly by search query, assignee, category, or status.
  - Sub-task checklists and notes for vendor quotes, contacts, and links.
- **Gentle Live Syncing**:
  - Automatically checks for updates when you switch back to the browser tab or focus the window, plus a gentle 60-second background poll.
  - Never interrupts when a modal is open or when you're dragging a task bar.
- **Private & Secure**:
  - Shared wedding passphrase authentication to keep your plans private.
  - Independent persistent 30-day session tokens for both partners.
- **Data Protection**:
  - One-click JSON backup export and restore.
  - One-click CSV export for spreadsheets.

---

## 🚀 Coolify Deployment Guide

This app is built specifically for zero-headache deployment on **Coolify**!

### Option 1: Git Repository (Recommended)
1. Push this repository to GitHub / GitLab / Gitea.
2. In your Coolify dashboard:
   - Click **+ Create New Resource** -> **Application** -> **Public/Private Repository**.
   - Select this repository.
   - Coolify will automatically detect the `Dockerfile`.
3. Under **Persistent Storage**:
   - Add a volume mount:
     - **Host Path**: (leave as Coolify default or name it `wedding_data`)
     - **Mount Path**: `/data`
4. *(Optional)* Under **Environment Variables**:
   - `APP_PASSWORD`: Set a passphrase upfront (or leave blank to set it via the web interface on first visit).
5. Click **Deploy**!

### Option 2: Docker Compose in Coolify
1. In Coolify, click **+ Create New Resource** -> **Docker Compose**.
2. Paste the contents of `docker-compose.yml`.
3. Ensure the volume `wedding_data:/data` is attached.
4. Click **Deploy**!

---

## 💻 Local Development

1. Ensure Node.js 22+ is installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser at:
   ```
   http://localhost:3000
   ```

---

## 📂 Data Storage

All wedding data is stored in a single SQLite database file:
- In Docker: `/data/wedding.db`
- In local development: `./data/wedding.db`

Backups can be taken directly from the web interface (**Settings ⚙️ -> Download JSON Backup**).
