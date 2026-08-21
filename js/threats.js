/* ==========================================================================
   SENTINEL-X — threats.js
   ========================================================================== */

const SXThreats = (() => {

  let all = [], page = 1;
  const PAGE_SIZE = 8;

  async function init() {
    document.getElementById('threat-results').innerHTML = SX.skeletonRows(6, 70);
    populateCountryFilter();

    const params = new URLSearchParams(location.search);
    if (params.get('q')) document.getElementById('f-query').value = params.get('q');

    const res = await SXApi.getThreatData();
    all = res.items;
    render();

    ['f-query', 'f-category', 'f-severity', 'f-country', 'f-date'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener(id === 'f-query' ? 'input' : 'change', SX.debounce(() => { page = 1; render(); }, 180));
    });

    document.getElementById('threats-export').addEventListener('click', exportCsv);
    document.getElementById('threat-modal-close').addEventListener('click', closeModal);
    document.getElementById('threat-modal-close2').addEventListener('click', closeModal);
    document.getElementById('threat-modal-overlay').addEventListener('click', e => { if (e.target.id === 'threat-modal-overlay') closeModal(); });
  }

  function populateCountryFilter() {
    const sel = document.getElementById('f-country');
    const codes = [...new Set(SXApi.DEMO_THREATS.map(t => t.countryCode))];
    codes.forEach(code => {
      const opt = document.createElement('option');
      opt.value = code; opt.textContent = code;
      sel.appendChild(opt);
    });
  }

  function applyFilters() {
    const q = document.getElementById('f-query').value.trim().toLowerCase();
    const category = document.getElementById('f-category').value;
    const severity = document.getElementById('f-severity').value;
    const country = document.getElementById('f-country').value;
    const dateWindow = document.getElementById('f-date').value;

    let items = all.slice();
    if (q) items = items.filter(t => t.name.toLowerCase().includes(q) || t.ip.includes(q) || t.location.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    if (category) items = items.filter(t => t.type === category);
    if (severity) items = items.filter(t => t.severity === severity);
    if (country) items = items.filter(t => t.countryCode === country);
    if (dateWindow) {
      const hrs = { '1h': 1, '24h': 24, '7d': 168 }[dateWindow];
      const cutoff = Date.now() - hrs * 3600000;
      items = items.filter(t => new Date(t.ts).getTime() >= cutoff);
    }
    return items;
  }

  function render() {
    const items = applyFilters();
    const box = document.getElementById('threat-results');
    if (!items.length) { box.innerHTML = SX.stateEmpty('No threats match your filters', 'Try widening the category, severity, or date range.'); document.getElementById('threat-pagination').innerHTML = ''; return; }

    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    box.innerHTML = pageItems.map(t => `
      <div class="result-row">
        <div class="result-main">
          <div class="r-name">${SX.escapeHtml(t.name)}</div>
          <div class="r-desc">${SX.escapeHtml(t.location)} · Source IP ${SX.escapeHtml(t.ip)}</div>
          <div class="r-tags"><span class="tag-chip">${SX.escapeHtml(t.id)}</span><span class="tag-chip">${SX.escapeHtml(t.source)}</span></div>
        </div>
        <div class="r-col"><span class="r-label">Type</span>${SX.escapeHtml(t.type)}</div>
        <div class="r-col"><span class="r-label">Severity</span>${SX.sevBadge(t.severity)}</div>
        <div class="r-col"><span class="r-label">Detected</span>${SX.timeAgo(t.ts)}</div>
        <div class="r-col"><button class="btn btn-sm" data-id="${t.id}">Details</button></div>
      </div>
    `).join('');

    box.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => openModal(items.find(i => i.id === btn.dataset.id)));
    });

    renderPagination(items.length, totalPages);
  }

  function renderPagination(total, totalPages) {
    const el = document.getElementById('threat-pagination');
    let btns = '';
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i !== 1 && i !== totalPages && Math.abs(i - page) > 1) {
        if (i === 2 || i === totalPages - 1) btns += `<span class="pg-btn" style="border:none;background:none;">…</span>`;
        continue;
      }
      btns += `<button class="pg-btn ${i === page ? 'active' : ''}" data-p="${i}">${i}</button>`;
    }
    el.innerHTML = `
      <span>${total} result${total === 1 ? '' : 's'}</span>
      <div class="pg-btns">
        <button class="pg-btn" id="pg-prev" ${page === 1 ? 'disabled' : ''}>‹</button>
        ${btns}
        <button class="pg-btn" id="pg-next" ${page === totalPages ? 'disabled' : ''}>›</button>
      </div>`;
    el.querySelectorAll('button[data-p]').forEach(b => b.addEventListener('click', () => { page = +b.dataset.p; render(); }));
    document.getElementById('pg-prev')?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
    document.getElementById('pg-next')?.addEventListener('click', () => { if (page < totalPages) { page++; render(); } });
  }

  function openModal(t) {
    if (!t) return;
    document.getElementById('threat-modal-body').innerHTML = `
      <div class="flex items-center gap-10" style="margin-bottom:16px;">
        <span class="badge badge-${t.severity}">${t.severity}</span>
        <span class="tag-chip">${SX.escapeHtml(t.id)}</span>
      </div>
      <h3 style="font-size:16px;margin-bottom:14px;">${SX.escapeHtml(t.name)}</h3>
      <div class="info-list">
        <div class="info-row"><span class="ir-k">Type</span><span class="ir-v">${SX.escapeHtml(t.type)}</span></div>
        <div class="info-row"><span class="ir-k">Location</span><span class="ir-v">${SX.escapeHtml(t.location)}</span></div>
        <div class="info-row"><span class="ir-k">Source IP</span><span class="ir-v">${SX.escapeHtml(t.ip)}</span></div>
        <div class="info-row"><span class="ir-k">Source</span><span class="ir-v">${SX.escapeHtml(t.source)}</span></div>
        <div class="info-row"><span class="ir-k">Detected</span><span class="ir-v">${new Date(t.ts).toLocaleString()}</span></div>
        <div class="info-row"><span class="ir-k">Status</span><span class="ir-v">Under Review</span></div>
      </div>
      <div style="margin-top:16px;">
        <a class="btn btn-sm" href="ip-intelligence.html?ip=${encodeURIComponent(t.ip)}">Investigate IP →</a>
      </div>
    `;
    document.getElementById('threat-modal-overlay').classList.add('open');
  }
  function closeModal() { document.getElementById('threat-modal-overlay').classList.remove('open'); }

  function exportCsv() {
    const items = applyFilters();
    if (!items.length) { SX.toast('Nothing to export', 'Adjust filters and try again.', 'warn'); return; }
    const header = ['ID', 'Name', 'Type', 'Severity', 'Location', 'IP', 'Source', 'Timestamp'];
    const rows = items.map(t => [t.id, t.name, t.type, t.severity, t.location, t.ip, t.source, t.ts]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sentinelx-threats-${Date.now()}.csv`;
    a.click();
    SX.toast('Export ready', `${items.length} threats exported.`, 'ok');
  }

  return { init };
})();
