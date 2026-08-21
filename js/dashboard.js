/* ==========================================================================
   SENTINEL-X — dashboard.js
   ========================================================================== */

const SXDashboard = (() => {

  let map, activityTimer, sourceThreats = [];

  async function init() {
    renderKpiSkeletons();
    paintActivitySkeleton();
    checkConnectivity();

    const [threatRes] = await Promise.all([SXApi.getThreatData()]);
    sourceThreats = threatRes.items;

    paintKpis(sourceThreats);
    initMap(sourceThreats);
    paintActivity(sourceThreats);
    paintThreatsOverTimeChart();
    paintTopCountries(sourceThreats);
    stampSync();

    document.getElementById('map-refresh')?.addEventListener('click', async () => {
      SX.toast('Refreshing map', 'Re-fetching threat locations…', 'ok');
      const r = await SXApi.getThreatData();
      sourceThreats = r.items;
      initMap(sourceThreats);
      stampSync();
    });

    // Simulate periodic live-style updates without hammering any API
    activityTimer = setInterval(() => {
      injectSyntheticEvent();
    }, 9000);
  }

  function renderKpiSkeletons() {
    const grid = document.getElementById('kpi-grid');
    grid.innerHTML = Array.from({ length: 5 }).map(() => `
      <div class="kpi-card"><div class="skel" style="height:16px;width:60%;margin-bottom:16px;"></div><div class="skel" style="height:28px;width:40%;"></div></div>
    `).join('');
  }

  function paintKpis(threats) {
    const critical = threats.filter(t => t.severity === 'critical').length;
    const active = threats.length;
    const monitoredIps = new Set(threats.map(t => t.ip)).size * 47; // scaled to represent monitored-IP pool
    const vulns = SXApi.DEMO_CVES.length + 137; // demo baseline + tracked CVEs
    const level = critical >= 3 ? 'CRITICAL' : critical >= 1 ? 'HIGH' : active > 5 ? 'MODERATE' : 'LOW';
    const levelColor = { CRITICAL: 'c-critical', HIGH: 'c-high', MODERATE: 'c-brand', LOW: 'c-ok' }[level];

    const cards = [
      { label: 'Active Threats', value: active, icon: 'radar', cls: 'c-high', sub: `${critical} classified critical`, trend: trendBadge(active, 9) },
      { label: 'Critical Incidents', value: critical, icon: 'alert', cls: 'c-critical', sub: 'Open across monitored assets', trend: trendBadge(critical, 2) },
      { label: 'Vulnerabilities', value: vulns, icon: 'bug', cls: 'c-high', sub: 'Tracked CVEs, all severities', trend: trendBadge(vulns, 141) },
      { label: 'Monitored IPs', value: monitoredIps.toLocaleString(), icon: 'globe', cls: 'c-info', sub: 'Across active watchlists', trend: null },
      { label: 'Threat Level', value: level, icon: 'shield', cls: levelColor, sub: 'Composite risk assessment', trend: null, isText: true },
    ];

    document.getElementById('kpi-grid').innerHTML = cards.map(c => `
      <div class="kpi-card">
        <div class="kpi-top">
          <div class="kpi-icon ${c.cls}">${sxIcon(c.icon)}</div>
          ${c.trend || ''}
        </div>
        <div class="kpi-value" style="${c.isText ? 'font-size:22px;' : ''}">${c.value}</div>
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>
    `).join('');
  }

  function trendBadge(current, previous) {
    if (previous === undefined) return '';
    const diff = current - previous;
    if (diff === 0) return `<span class="kpi-trend flat">flat</span>`;
    const pct = Math.abs(Math.round((diff / Math.max(previous, 1)) * 100));
    const up = diff > 0;
    return `<span class="kpi-trend ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${pct}%</span>`;
  }

  /* ---------------- Map ---------------- */
  function initMap(threats) {
    const container = document.getElementById('threat-map');
    document.getElementById('map-loading')?.remove();

    if (map) { map.remove(); }
    map = L.map('threat-map', { zoomControl: true, worldCopyJump: true, minZoom: 1.4 }).setView([20, 10], 1.9);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 18,
    }).addTo(map);

    const legend = document.querySelector('.map-legend');
    if (legend) container.appendChild(legend);

    const colors = { critical: '#f0453a', high: '#ff8a3d', medium: '#f0b429', low: '#38bdf8' };
    threats.forEach(t => {
      const color = colors[t.severity] || colors.low;
      const marker = L.circleMarker([t.lat, t.lon], {
        radius: t.severity === 'critical' ? 9 : t.severity === 'high' ? 7.5 : 6,
        color, weight: 1.5, fillColor: color, fillOpacity: 0.55,
      }).addTo(map);
      marker.bindPopup(`
        <div class="map-popup">
          <div class="mp-title">${SX.escapeHtml(t.name)}</div>
          <div class="mp-row"><span>Location</span><b>${SX.escapeHtml(t.location)}</b></div>
          <div class="mp-row"><span>IP</span><b>${SX.escapeHtml(t.ip)}</b></div>
          <div class="mp-row"><span>Type</span><b>${SX.escapeHtml(t.type)}</b></div>
          <div class="mp-row"><span>Severity</span><b>${SX.escapeHtml(t.severity)}</b></div>
          <div class="mp-row"><span>Detected</span><b>${SX.timeAgo(t.ts)}</b></div>
          <div class="mp-row"><span>Source</span><b>${SX.escapeHtml(t.source)}</b></div>
        </div>
      `);
    });
  }

  /* ---------------- Activity feed ---------------- */
  function paintActivitySkeleton() {
    document.getElementById('activity-feed').innerHTML = SX.skeletonRows(6, 50);
  }

  const EVENT_TEMPLATES = [
    { type: 'THREAT DETECTED', sev: 'critical', desc: (t) => `Suspicious activity identified from ${t.ip}` },
    { type: 'INTELLIGENCE UPDATED', sev: 'info', desc: () => 'New vulnerability information received from feed provider' },
    { type: 'IP ANALYSIS', sev: 'info', desc: (t) => `IP intelligence lookup completed for ${t.ip}` },
    { type: 'INCIDENT ESCALATED', sev: 'high', desc: (t) => `${t.name} escalated for analyst review` },
    { type: 'SCAN COMPLETED', sev: 'medium', desc: () => 'Scheduled vulnerability scan finished on monitored assets' },
  ];

  function paintActivity(threats) {
    const box = document.getElementById('activity-feed');
    if (!threats.length) { box.innerHTML = SX.stateEmpty(); return; }
    const events = threats.slice(0, 8).map((t, i) => {
      const tpl = EVENT_TEMPLATES[i % EVENT_TEMPLATES.length];
      return { ...tpl, ts: t.ts, source: t.source, threat: t };
    });
    box.innerHTML = events.map(renderActivityItem).join('');
  }

  function renderActivityItem(e) {
    return `
      <div class="activity-item">
        <span class="act-ind ${e.sev}"></span>
        <div class="act-body">
          <div class="act-top">
            <span class="act-type">${e.type}</span>
            <span class="act-time mono">${new Date(e.ts).toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
          <div class="act-desc">${SX.escapeHtml(e.desc(e.threat))}</div>
          <div class="act-meta">Source: ${SX.escapeHtml(e.source)} · ${SX.timeAgo(e.ts)}</div>
        </div>
      </div>`;
  }

  function injectSyntheticEvent() {
    if (!sourceThreats.length) return;
    const box = document.getElementById('activity-feed');
    const t = sourceThreats[Math.floor(Math.random() * sourceThreats.length)];
    const tpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    const e = { ...tpl, ts: new Date().toISOString(), source: 'Demo Feed', threat: t };
    box.insertAdjacentHTML('afterbegin', renderActivityItem(e));
    while (box.children.length > 10) box.lastElementChild.remove();
  }

  /* ---------------- Charts ---------------- */
  function paintThreatsOverTimeChart() {
    const ctx = document.getElementById('chart-threats-time');
    if (!ctx || typeof Chart === 'undefined') return;
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const seedVals = [12, 15, 11, 18, 22, 19, 25, 21, 28, 24, 30, 26, 33, 29];
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Threat events',
          data: seedVals,
          borderColor: '#4f7cff', backgroundColor: 'rgba(79,124,255,0.12)',
          borderWidth: 2, tension: 0.35, fill: true, pointRadius: 0, pointHoverRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c667a', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c667a', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  function paintTopCountries(threats) {
    const counts = {};
    threats.forEach(t => { counts[t.location.split(',').pop().trim()] = (counts[t.location.split(',').pop().trim()] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(...entries.map(e => e[1]), 1);
    const box = document.getElementById('top-countries');
    if (!entries.length) { box.innerHTML = SX.stateEmpty(); return; }
    box.innerHTML = entries.map(([name, count]) => `
      <div class="mini-row">
        <div class="mr-name"><span class="flag"></span>${SX.escapeHtml(name)}</div>
        <div class="flex items-center">
          <div class="mini-bar-bg"><div class="mini-bar-fill" style="width:${(count / max) * 100}%"></div></div>
          <span class="mr-val" style="margin-left:10px;">${count}</span>
        </div>
      </div>
    `).join('');
  }

  /* ---------------- Connectivity status ---------------- */
  async function checkConnectivity() {
    const el = document.getElementById('stat-api');
    const ind = document.getElementById('ind-api');
    try {
      const online = navigator.onLine;
      if (!online) throw new Error('offline');
      el.textContent = 'Online';
    } catch {
      el.textContent = 'Degraded';
      if (ind) ind.style.background = 'var(--sev-medium)';
    }
  }

  function stampSync() {
    const el = document.getElementById('stat-sync');
    if (el) el.textContent = SX.formatTime();
  }

  return { init };
})();
