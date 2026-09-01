/* ==========================================================================
   SENTINEL-X — app.js
   Renders the shared app shell (sidebar + topbar), and wires up global
   behavior: theme, clock, command palette (Ctrl+K), notification drawer,
   mobile navigation. Every page includes this after utils.js / api.js.
   ========================================================================== */

const SXNav = [
  { group: 'Overview', items: [
    { href: 'index.html', label: 'Dashboard', icon: 'grid' },
  ]},
  { group: 'Intelligence', items: [
    { href: 'threats.html', label: 'Threat Intelligence', icon: 'radar' },
    { href: 'ip-intelligence.html', label: 'IP Intelligence', icon: 'globe' },
    { href: 'vulnerabilities.html', label: 'Vulnerabilities', icon: 'bug' },
  ]},
  { group: 'Operations', items: [
    { href: 'incidents.html', label: 'Incidents', icon: 'alert' },
    { href: 'network.html', label: 'Network Intelligence', icon: 'network' },
    { href: 'reports.html', label: 'Security Reports', icon: 'doc' },
  ]},
  { group: 'System', items: [
    { href: 'settings.html', label: 'Settings', icon: 'settings' },
  ]},
];

const SXIcons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="M12 3v9l6 3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z"/>',
  bug: '<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M8 11H4M20 11h-4M8 15H5M19 15h-3M12 7V4M9 5l1.5 2M15 5l-1.5 2"/>',
  alert: '<path d="M12 3l9 16H3L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  network: '<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M6.8 7.6L11 16M17.2 7.6L13 16M7 6h10"/>',
  doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
  shield: '<path d="M12 2l8 3.5v6c0 5-3.4 8.5-8 10.5C7.4 20 4 16.5 4 11.5v-6L12 2z"/>',
};

function sxIcon(name, extra = '') {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${SXIcons[name] || ''}</svg>`;
}

const SXApp = (() => {

  function currentPage() {
    const p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  /* ---------------- Sidebar ---------------- */
  function renderSidebar() {
    const collapsed = SX.storeGet('sidebarCollapsed', false);
    const page = currentPage();
    const groups = SXNav.map(g => `
      <div class="nav-group">
        <div class="nav-group-title">${g.group}</div>
        ${g.items.map(item => `
          <a class="nav-item ${item.href === page ? 'active' : ''}" href="${item.href}">
            ${sxIcon(item.icon)}
            <span class="nav-label">${item.label}</span>
          </a>`).join('')}
      </div>`).join('');

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">${sentinelLogoSvg()}</div>
          <div class="brand-text">
            <div class="name">SENTINEL<span>-X</span></div>
            <div class="tag">Cyber Intelligence</div>
          </div>
        </div>
        <nav class="sidebar-nav">${groups}</nav>
        <div class="sidebar-foot">
          <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">${sxIcon('chevron')}</button>
          <span class="sidebar-foot-text">v2.4.1 · SOC Build</span>
        </div>
      </aside>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    `;
  }

  function sentinelLogoSvg() {
    return `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
      <defs><linearGradient id="sxg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6b91ff"/><stop offset="1" stop-color="#4f7cff"/>
      </linearGradient></defs>
      <path d="M16 2L28 7v8c0 8-5 13-12 15C9 28 4 23 4 15V7L16 2z" fill="url(#sxg)" opacity="0.16"/>
      <path d="M16 2L28 7v8c0 8-5 13-12 15C9 28 4 23 4 15V7L16 2z" stroke="url(#sxg)" stroke-width="1.6"/>
      <path d="M11 15.5l3.4 3.4L21.5 11.5" stroke="#6b91ff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  /* ---------------- Topbar ---------------- */
  function renderTopbar(title, crumbs) {
    return `
      <header class="topbar">
        <button class="icon-btn mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">${sxIcon('menu')}</button>
        <div class="topbar-title">
          <h1>${title}</h1>
          <div class="crumbs">${crumbs}</div>
        </div>
        <div class="topbar-search" id="topbar-search-trigger" role="button" tabindex="0" aria-label="Open command palette">
          ${sxIcon('search')}
          <span>Search IPs, CVEs, threats…</span>
          <kbd>Ctrl K</kbd>
        </div>
        <div class="topbar-clock">
          <div class="time mono" id="clock-time">--:--:--</div>
          <div class="date" id="clock-date">—</div>
        </div>
        <button class="icon-btn" id="notif-btn" aria-label="Notifications">
          ${sxIcon('bell')}
          <span class="dot" id="notif-dot" style="display:none;"></span>
        </button>
        <div class="topbar-profile">
          <div class="avatar">JL</div>
          <div class="who"><span class="n">Joyful Lemabari</span><span class="r">Security Analyst</span></div>
        </div>
      </header>
    `;
  }

  /* ---------------- Clock ---------------- */
  function startClock() {
    function tick() {
      const now = new Date();
      const t = document.getElementById('clock-time');
      const d = document.getElementById('clock-date');
      if (t) t.textContent = SX.formatTime(now);
      if (d) d.textContent = SX.formatDate(now);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------- Theme ---------------- */
  function applyTheme() {
    const theme = SX.storeGet('theme', 'dark');
    const compact = SX.storeGet('compactMode', false);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-compact', compact ? 'true' : 'false');
  }

  /* ---------------- Sidebar interactions ---------------- */
  function wireSidebar() {
    const shell = document.querySelector('.app-shell');
    const collapsed = SX.storeGet('sidebarCollapsed', false);
    if (collapsed) shell.classList.add('sidebar-collapsed');

    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      const isCollapsed = shell.classList.toggle('sidebar-collapsed');
      SX.storeSet('sidebarCollapsed', isCollapsed);
    });

    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      backdrop.classList.add('open');
    });
    backdrop?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('open');
    });
  }

  /* ---------------- Notifications ---------------- */
  const DEFAULT_NOTIFS = [
    { id: 'n1', title: 'Critical threat detected', desc: 'Ransomware dropper flagged on external-facing host.', type: 'critical', time: -6, read: false },
    { id: 'n2', title: 'New vulnerability published', desc: 'CVE-2024-6387 affects monitored OpenSSH assets.', type: 'high', time: -40, read: false },
    { id: 'n3', title: 'API feed updated', desc: 'IP intelligence provider refreshed successfully.', type: 'info', time: -95, read: true },
    { id: 'n4', title: 'Investigation completed', desc: 'INC-3391 moved to Resolved by S. Alvarez.', type: 'ok', time: -240, read: true },
    { id: 'n5', title: 'System warning', desc: 'Vulnerability feed provider responded slowly (620ms).', type: 'medium', time: -360, read: true },
  ];

  function getNotifs() {
    return SX.storeGet('notifications', DEFAULT_NOTIFS);
  }
  function setNotifs(list) { SX.storeSet('notifications', list); }

  function renderDrawer() {
    return `
      <div class="drawer-overlay" id="drawer-overlay"></div>
      <div class="drawer" id="notif-drawer">
        <div class="drawer-head">
          <strong style="font-size:13.5px;">Notifications</strong>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" id="notif-clear">Clear all</button>
            <button class="icon-btn" id="notif-close">${sxIcon('chevron')}</button>
          </div>
        </div>
        <div class="drawer-list" id="notif-list"></div>
      </div>
    `;
  }

  function paintNotifs() {
    const list = getNotifs();
    const box = document.getElementById('notif-list');
    const dot = document.getElementById('notif-dot');
    if (!box) return;
    const unread = list.filter(n => !n.read).length;
    if (dot) dot.style.display = unread ? 'block' : 'none';
    if (!list.length) { box.innerHTML = SX.stateEmpty('All caught up', 'No notifications right now.'); return; }
    const colorMap = { critical: 'var(--sev-critical)', high: 'var(--sev-high)', medium: 'var(--sev-medium)', info: 'var(--status-info)', ok: 'var(--status-ok)' };
    box.innerHTML = list.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-dot" style="background:${colorMap[n.type] || 'var(--status-info)'}"></div>
        <div>
          <div class="n-title">${SX.escapeHtml(n.title)}</div>
          <div class="n-desc">${SX.escapeHtml(n.desc)}</div>
          <div class="n-time">${SX.timeAgo(new Date(Date.now() + n.time * 60000).toISOString())}</div>
        </div>
      </div>
    `).join('');
    box.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', () => {
        const list2 = getNotifs().map(n => n.id === el.dataset.id ? { ...n, read: true } : n);
        setNotifs(list2);
        paintNotifs();
      });
    });
  }

  function wireDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('notif-drawer');
    const open = () => { overlay.classList.add('open'); drawer.classList.add('open'); paintNotifs(); };
    const close = () => { overlay.classList.remove('open'); drawer.classList.remove('open'); };
    document.getElementById('notif-btn')?.addEventListener('click', open);
    document.getElementById('notif-close')?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    document.getElementById('notif-clear')?.addEventListener('click', () => { setNotifs([]); paintNotifs(); });
    paintNotifs();
  }

  /* ---------------- Command Palette ---------------- */
  function renderCmdk() {
    return `
      <div class="cmdk-overlay" id="cmdk-overlay">
        <div class="cmdk">
          <div class="cmdk-input-row">
            ${sxIcon('search')}
            <input type="text" id="cmdk-input" placeholder="Search IPs, CVEs, threats, incidents, countries…" autocomplete="off">
            <kbd class="mono" style="font-size:10px;color:var(--text-tertiary);border:1px solid var(--border-default);padding:2px 5px;border-radius:4px;">ESC</kbd>
          </div>
          <div class="cmdk-results" id="cmdk-results"></div>
        </div>
      </div>
    `;
  }

  const CMDK_INDEX = [
    { label: 'Dashboard', type: 'page', href: 'index.html' },
    { label: 'Threat Intelligence', type: 'page', href: 'threats.html' },
    { label: 'IP Intelligence', type: 'page', href: 'ip-intelligence.html' },
    { label: 'Vulnerabilities / CVE Center', type: 'page', href: 'vulnerabilities.html' },
    { label: 'Incidents', type: 'page', href: 'incidents.html' },
    { label: 'Network Intelligence', type: 'page', href: 'network.html' },
    { label: 'Security Reports', type: 'page', href: 'reports.html' },
    { label: 'Settings', type: 'page', href: 'settings.html' },
    { label: 'CVE-2024-6387 — OpenSSH RCE', type: 'cve', href: 'vulnerabilities.html?q=CVE-2024-6387' },
    { label: 'CVE-2021-44228 — Log4Shell', type: 'cve', href: 'vulnerabilities.html?q=CVE-2021-44228' },
    { label: '8.8.8.8 — Google DNS', type: 'ip', href: 'ip-intelligence.html?ip=8.8.8.8' },
    { label: '1.1.1.1 — Cloudflare DNS', type: 'ip', href: 'ip-intelligence.html?ip=1.1.1.1' },
  ];

  function wireCmdk() {
    const overlay = document.getElementById('cmdk-overlay');
    const input = document.getElementById('cmdk-input');
    const results = document.getElementById('cmdk-results');

    function paint(query = '') {
      const q = query.trim().toLowerCase();
      const matches = q ? CMDK_INDEX.filter(i => i.label.toLowerCase().includes(q)) : CMDK_INDEX.slice(0, 8);
      if (!matches.length) { results.innerHTML = `<div class="cmdk-empty">No matches for "${SX.escapeHtml(query)}"</div>`; return; }
      results.innerHTML = matches.map((m, i) => `
        <a class="cmdk-item ${i === 0 ? 'sel' : ''}" href="${m.href}">
          ${sxIcon(m.type === 'page' ? 'grid' : m.type === 'cve' ? 'bug' : 'globe')}
          <span>${SX.escapeHtml(m.label)}</span>
          <span class="k-type">${m.type}</span>
        </a>`).join('');
    }

    const open = () => { overlay.classList.add('open'); input.value = ''; paint(); setTimeout(() => input.focus(), 30); };
    const close = () => overlay.classList.remove('open');

    document.getElementById('topbar-search-trigger')?.addEventListener('click', open);
    document.getElementById('topbar-search-trigger')?.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    overlay?.addEventListener('click', e => { if (e.target === overlay) close(); });
    input?.addEventListener('input', e => paint(e.target.value));

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
      if (e.key === 'Escape') close();
    });
  }

  /* ---------------- Boot ---------------- */
  function mount({ title = 'Dashboard', crumbs = 'SENTINEL-X / Overview' } = {}) {
    applyTheme();
    const root = document.getElementById('app-root');
    const page = document.getElementById('page-slot')?.innerHTML || '';
    root.innerHTML = `
      <div class="app-shell">
        ${renderSidebar()}
        <div class="content-col">
          ${renderTopbar(title, crumbs)}
          <main class="main-content" id="main-content">${page}</main>
        </div>
      </div>
      ${renderDrawer()}
      ${renderCmdk()}
    `;
    wireSidebar();
    wireDrawer();
    wireCmdk();
    startClock();

    document.querySelectorAll('#sidebar .nav-item').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth <= 780) {
          document.getElementById('sidebar').classList.remove('mobile-open');
          document.getElementById('sidebar-backdrop').classList.remove('open');
        }
      });
    });
  }

  return { mount, currentPage, sentinelLogoSvg };
})();
