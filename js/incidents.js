/* ==========================================================================
   SENTINEL-X — incidents.js
   ========================================================================== */

const SXIncidents = (() => {

  let all = [], page = 1;
  const PAGE_SIZE = 8;
  const STATUSES = ['New', 'Investigating', 'Contained', 'Resolved'];
  const ASSIGNEES = ['S. Alvarez', 'J. Okafor', 'M. Tanaka', 'R. Kowalski', 'Unassigned'];

  const SEED = [
    { threat: 'Ransomware Dropper — Loader Stage', severity: 'critical', source: 'EDR Sensor', status: 'Investigating', assigned: 'S. Alvarez', offset: -14 },
    { threat: 'Emotet Botnet C2 Beacon', severity: 'critical', source: 'Network IDS', status: 'New', assigned: 'Unassigned', offset: -40 },
    { threat: 'Customer Records Exfiltration Attempt', severity: 'critical', source: 'DLP Alert', status: 'Contained', assigned: 'J. Okafor', offset: -95 },
    { threat: 'Log4Shell Exploit Attempt', severity: 'high', source: 'WAF', status: 'Resolved', assigned: 'M. Tanaka', offset: -600 },
    { threat: 'Credential Phishing Kit — Banking Lure', severity: 'high', source: 'Email Gateway', status: 'Investigating', assigned: 'R. Kowalski', offset: -180 },
    { threat: 'Volumetric UDP DDoS', severity: 'high', source: 'CDN Edge', status: 'Contained', assigned: 'S. Alvarez', offset: -320 },
    { threat: 'Mirai Variant Beaconing', severity: 'high', source: 'Network IDS', status: 'New', assigned: 'Unassigned', offset: -60 },
    { threat: 'SSH Brute Force Sweep', severity: 'medium', source: 'Auth Logs', status: 'Resolved', assigned: 'J. Okafor', offset: -900 },
    { threat: 'Malicious Typosquat Domain', severity: 'medium', source: 'DNS Filter', status: 'Investigating', assigned: 'M. Tanaka', offset: -210 },
    { threat: 'Fake Invoice Phishing Campaign', severity: 'medium', source: 'Email Gateway', status: 'Resolved', assigned: 'R. Kowalski', offset: -1200 },
    { threat: 'Suspicious Tor Exit Node Traffic', severity: 'low', source: 'Proxy Logs', status: 'New', assigned: 'Unassigned', offset: -25 },
    { threat: 'Port Scan — Full TCP Sweep', severity: 'low', source: 'Firewall', status: 'Resolved', assigned: 'S. Alvarez', offset: -1500 },
  ];

  function seedData() {
    return SEED.map((s, i) => ({
      id: `INC-${3300 + i}`,
      threat: s.threat, severity: s.severity, source: s.source, status: s.status, assigned: s.assigned,
      detected: new Date(Date.now() + s.offset * 60000).toISOString(),
    }));
  }

  function loadIncidents() {
    let data = SX.storeGet('incidents', null);
    if (!data) { data = seedData(); SX.storeSet('incidents', data); }
    return data;
  }
  function saveIncidents(data) { SX.storeSet('incidents', data); }

  function init() {
    all = loadIncidents();
    render();
    ['i-query', 'i-severity', 'i-status', 'i-sort'].forEach(id => {
      document.getElementById(id).addEventListener(id === 'i-query' ? 'input' : 'change', SX.debounce(() => { page = 1; render(); }, 180));
    });
    document.getElementById('inc-modal-close').addEventListener('click', closeModal);
    document.getElementById('inc-modal-close2').addEventListener('click', closeModal);
    document.getElementById('inc-modal-overlay').addEventListener('click', e => { if (e.target.id === 'inc-modal-overlay') closeModal(); });
    document.addEventListener('click', closeAllStatusMenus);
  }

  function applyFilters() {
    const q = document.getElementById('i-query').value.trim().toLowerCase();
    const sev = document.getElementById('i-severity').value;
    const status = document.getElementById('i-status').value;
    const sort = document.getElementById('i-sort').value;
    let items = all.slice();
    if (q) items = items.filter(i => i.id.toLowerCase().includes(q) || i.threat.toLowerCase().includes(q));
    if (sev) items = items.filter(i => i.severity === sev);
    if (status) items = items.filter(i => i.status === status);
    const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
    if (sort === 'detected-desc') items.sort((a, b) => new Date(b.detected) - new Date(a.detected));
    else if (sort === 'detected-asc') items.sort((a, b) => new Date(a.detected) - new Date(b.detected));
    else if (sort === 'severity') items.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
    return items;
  }

  function render() {
    const items = applyFilters();
    const body = document.getElementById('incidents-body');
    if (!items.length) {
      body.innerHTML = `<tr><td colspan="8">${SX.stateEmpty('No incidents match your filters')}</td></tr>`;
      document.getElementById('incidents-pagination').innerHTML = '';
      return;
    }
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    body.innerHTML = pageItems.map(inc => `
      <tr>
        <td class="mono">${inc.id}</td>
        <td>${SX.escapeHtml(inc.threat)}</td>
        <td>${SX.sevBadge(inc.severity)}</td>
        <td class="text-secondary">${SX.escapeHtml(inc.source)}</td>
        <td class="text-secondary">${SX.timeAgo(inc.detected)}</td>
        <td>
          <div class="status-select">
            <button class="status-pill-btn status-${inc.status.toLowerCase()}" data-id="${inc.id}">
              ${inc.status} ${sxIcon('chevron', 'style="transform:rotate(90deg)"')}
            </button>
            <div class="status-menu" data-menu="${inc.id}">
              ${STATUSES.map(s => `<button data-set-status="${s}" data-id="${inc.id}">${s}</button>`).join('')}
            </div>
          </div>
        </td>
        <td>
          <div class="assignee"><span class="av-sm">${initials(inc.assigned)}</span>${SX.escapeHtml(inc.assigned)}</div>
        </td>
        <td><button class="btn btn-sm" data-detail="${inc.id}">View</button></td>
      </tr>
    `).join('');

    body.querySelectorAll('.status-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = body.querySelector(`.status-menu[data-menu="${btn.dataset.id}"]`);
        closeAllStatusMenus();
        menu.classList.add('open');
      });
    });
    body.querySelectorAll('button[data-set-status]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id, status = btn.dataset.setStatus;
        all = all.map(i => i.id === id ? { ...i, status } : i);
        saveIncidents(all);
        SX.toast('Status updated', `${id} marked as ${status}.`, 'ok');
        render();
      });
    });
    body.querySelectorAll('button[data-detail]').forEach(btn => btn.addEventListener('click', () => openModal(all.find(i => i.id === btn.dataset.detail))));

    renderPagination(items.length, totalPages);
  }

  function closeAllStatusMenus() { document.querySelectorAll('.status-menu.open').forEach(m => m.classList.remove('open')); }

  function initials(name) {
    if (name === 'Unassigned') return '—';
    return name.split(' ').map(p => p[0]).join('').slice(0, 2);
  }

  function renderPagination(total, totalPages) {
    const el = document.getElementById('incidents-pagination');
    let btns = '';
    for (let i = 1; i <= totalPages; i++) btns += `<button class="pg-btn ${i === page ? 'active' : ''}" data-p="${i}">${i}</button>`;
    el.innerHTML = `<span>${total} incident${total === 1 ? '' : 's'}</span><div class="pg-btns"><button class="pg-btn" id="inc-prev" ${page === 1 ? 'disabled' : ''}>‹</button>${btns}<button class="pg-btn" id="inc-next" ${page === totalPages ? 'disabled' : ''}>›</button></div>`;
    el.querySelectorAll('button[data-p]').forEach(b => b.addEventListener('click', () => { page = +b.dataset.p; render(); }));
    document.getElementById('inc-prev')?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
    document.getElementById('inc-next')?.addEventListener('click', () => { if (page < totalPages) { page++; render(); } });
  }

  function openModal(inc) {
    if (!inc) return;
    document.getElementById('inc-modal-body').innerHTML = `
      <div class="flex items-center gap-10" style="margin-bottom:14px;">
        ${SX.sevBadge(inc.severity)}<span class="tag-chip">${inc.id}</span>
      </div>
      <h3 style="font-size:15px;margin-bottom:14px;">${SX.escapeHtml(inc.threat)}</h3>
      <div class="info-list">
        <div class="info-row"><span class="ir-k">Status</span><span class="ir-v">${SX.escapeHtml(inc.status)}</span></div>
        <div class="info-row"><span class="ir-k">Source</span><span class="ir-v">${SX.escapeHtml(inc.source)}</span></div>
        <div class="info-row"><span class="ir-k">Detected</span><span class="ir-v">${new Date(inc.detected).toLocaleString()}</span></div>
        <div class="info-row"><span class="ir-k">Assigned To</span><span class="ir-v">${SX.escapeHtml(inc.assigned)}</span></div>
      </div>`;
    document.getElementById('inc-modal-overlay').classList.add('open');
  }
  function closeModal() { document.getElementById('inc-modal-overlay').classList.remove('open'); }

  return { init };
})();
