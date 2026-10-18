// Central Reactive State Store
const AppState = {
  settings: {
    partner1_name: 'Partner 1',
    partner1_color: '#D46A80',
    partner2_name: 'Partner 2',
    partner2_color: '#437C90',
    wedding_title: 'Our Wedding',
    wedding_date: '2027-06-20'
  },

  activeUser: localStorage.getItem('wedding_active_partner') || 'partner1', // 'partner1' or 'partner2'
  tasks: [],
  view: 'gantt', // 'gantt' | 'kanban' | 'milestones'
  zoom: 'days',
  theme: localStorage.getItem('wedding_theme') || 'light',

  filter: {
    search: '',
    assignee: 'all', // 'all' | 'partner1' | 'partner2' | 'both'
    category: 'all',
    status: 'all'
  },

  listeners: new Set(),

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notify(event, payload) {
    for (const listener of this.listeners) {
      listener(event, payload);
    }
  },

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('wedding_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.notify('theme-changed', theme);
  },

  getActiveUserName() {
    return `${this.settings.partner1_name || 'Partner 1'} & ${this.settings.partner2_name || 'Partner 2'}`;
  },

  getPartnerName(assigneeKey) {
    if (assigneeKey === 'partner1') return this.settings.partner1_name || 'Partner 1';
    if (assigneeKey === 'partner2') return this.settings.partner2_name || 'Partner 2';
    if (assigneeKey === 'both') return `${this.settings.partner1_name || 'P1'} & ${this.settings.partner2_name || 'P2'}`;
    return 'Unassigned';
  },

  setSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    // Update CSS variables for colors
    if (this.settings.partner1_color) {
      document.documentElement.style.setProperty('--partner1-color', this.settings.partner1_color);
    }
    if (this.settings.partner2_color) {
      document.documentElement.style.setProperty('--partner2-color', this.settings.partner2_color);
    }
    this.notify('settings-changed', this.settings);
  },

  setTasks(tasks) {
    this.tasks = tasks;
    this.notify('tasks-changed', this.tasks);
  },

  setView(view) {
    this.view = view;
    this.notify('view-changed', view);
  },

  setZoom(zoom) {
    this.zoom = zoom;
    this.notify('zoom-changed', zoom);
  },

  setFilter(key, value) {
    this.filter[key] = value;
    this.notify('filter-changed', this.filter);
  },

  getFilteredTasks() {
    return this.tasks.filter(task => {
      // Search
      if (this.filter.search) {
        const query = this.filter.search.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(query);
        const matchCategory = (task.category || '').toLowerCase().includes(query);
        const matchNotes = (task.notes || '').toLowerCase().includes(query);
        if (!matchTitle && !matchCategory && !matchNotes) return false;
      }

      // Assignee
      if (this.filter.assignee !== 'all' && task.assignee !== this.filter.assignee) {
        return false;
      }

      // Category
      if (this.filter.category !== 'all' && (task.category || 'General') !== this.filter.category) {
        return false;
      }

      // Status
      if (this.filter.status !== 'all' && task.status !== this.filter.status) {
        return false;
      }

      return true;
    });
  },

  getCategories() {
    const set = new Set();
    for (const t of this.tasks) {
      if (t.category && t.category.trim()) set.add(t.category.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  },

  getCategoryColor(categoryName) {
    const cat = (categoryName || 'General').trim();
    const categories = this.getCategories();
    let idx = categories.indexOf(cat);
    if (idx === -1) {
      // Deterministic string hash fallback for categories not yet in tasks
      let hash = 0;
      for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
      }
      idx = Math.abs(hash);
    }
    return CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
  }
};

const CATEGORY_PALETTE = [
  {
    name: 'Teal',
    primary: '#1E9E8C',
    gradient: 'linear-gradient(135deg, #2AC1AB 0%, #178273 100%)',
    lightBg: '#E6F7F4',
    border: '#A5E2D9',
    text: '#0E5C51'
  },
  {
    name: 'Sapphire',
    primary: '#3277DC',
    gradient: 'linear-gradient(135deg, #4F93F5 0%, #205EBA 100%)',
    lightBg: '#EEF4FD',
    border: '#B3D0FB',
    text: '#134794'
  },
  {
    name: 'Terracotta',
    primary: '#E06443',
    gradient: 'linear-gradient(135deg, #F07E60 0%, #C44C2C 100%)',
    lightBg: '#FDF1ED',
    border: '#F8C2B3',
    text: '#8F2F16'
  },
  {
    name: 'Amethyst',
    primary: '#7C43BD',
    gradient: 'linear-gradient(135deg, #985FD5 0%, #632FA0 100%)',
    lightBg: '#F5EDFC',
    border: '#D4B6F3',
    text: '#502380'
  },
  {
    name: 'Forest Emerald',
    primary: '#2B8F53',
    gradient: 'linear-gradient(135deg, #3AA867 0%, #1F7341 100%)',
    lightBg: '#EBF7F0',
    border: '#B1E3C4',
    text: '#13582F'
  },
  {
    name: 'Warm Ochre',
    primary: '#CA8A26',
    gradient: 'linear-gradient(135deg, #E0A23D 0%, #AC7218 100%)',
    lightBg: '#FBF5EB',
    border: '#F1D6A8',
    text: '#7C500E'
  },
  {
    name: 'Coral',
    primary: '#D64062',
    gradient: 'linear-gradient(135deg, #E85979 0%, #BC2B4C 100%)',
    lightBg: '#FDF0F3',
    border: '#F6B7C6',
    text: '#8B1832'
  },
  {
    name: 'Ocean Cobalt',
    primary: '#1D7A94',
    gradient: 'linear-gradient(135deg, #2D94B1 0%, #146277 100%)',
    lightBg: '#E9F5F8',
    border: '#A9DBE8',
    text: '#0C4B5B'
  },
  {
    name: 'Slate Denim',
    primary: '#56647E',
    gradient: 'linear-gradient(135deg, #6C7D9B 0%, #435066 100%)',
    lightBg: '#F1F3F7',
    border: '#C1C9D6',
    text: '#2F3847'
  },
  {
    name: 'Mulberry Plum',
    primary: '#9B3968',
    gradient: 'linear-gradient(135deg, #B54F7F 0%, #7E2651 100%)',
    lightBg: '#F9EDF3',
    border: '#E8B3CC',
    text: '#62173C'
  },
  {
    name: 'Rust Amber',
    primary: '#B65A34',
    gradient: 'linear-gradient(135deg, #CA6F49 0%, #9B4421 100%)',
    lightBg: '#F9F1EC',
    border: '#ECC2AE',
    text: '#723115'
  },
  {
    name: 'Electric Indigo',
    primary: '#6351DE',
    gradient: 'linear-gradient(135deg, #7E6DF0 0%, #4D3BC2 100%)',
    lightBg: '#F1EFFF',
    border: '#BFB7FA',
    text: '#38289F'
  }
];
