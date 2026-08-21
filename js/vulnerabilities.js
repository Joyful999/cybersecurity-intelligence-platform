/* ==========================================================================
   SENTINEL-X — vulnerabilities.js
   ========================================================================== */

const SXVulns = (() => {

  let all = [], page = 1, activeSev = '';
  const PAGE_SIZE = 8;

  async function init() {
    document.getElementById('vuln-results').innerHTML = SX.skeletonRows(6, 84);

    const params = new URLSearchParams(location.search);
    const initialQuery = params.get('q') || '';
    if (initialQuery) document.getElementById('v-query').value = initialQuery;

    await load(initialQuery);

    document.getElementById('v-query').addEventListener('input', SX.debounce(() => load(document.getElementById('v-query').value), 400));
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.style.borderColor = 'var(--border-default)');
        chip.style.borderColor = 'var(--brand-500)';
        activeSev = chip.dataset.sev;
        page = 1;
        renderList();
      });
    });
    document.getElementById('vuln-modal-close').addEventListener('click', closeModal);
    document.getElementById('vuln-modal-close2').addEventListener('click', closeModal);
    document.getElementById('vuln-modal-overlay').addEventListener('click', e => { if (e.target.id === 'vuln-modal-overlay') closeModal(); });
  }

  async function load(keyword) {
    document.getElementById('vuln-results').innerHTML = SX.skeletonRows(6, 84);
    const res = await SXApi.getVulnerabilities({ keyword, resultsPerPage: 30 });
    all = res.items;
    const badge = document.getElementById('vuln-source-badge');
    badge.textContent = res.meta.source === 'live' ? `LIVE · NVD (${res.meta.total} total)` : 'DEMO DATASET';
    badge.className = `badge ${res.meta.source === 'live' ? 'badge-ok' : 'badge-neutral'}`;
    renderList();
  }

  function renderList() {
    let items = all.slice();
    if (activeSev) items = items.filter(c => c.severity === activeSev);
    const box = document.getElementById('vuln-results');
    if (!items.length) { box.innerHTML = SX.stateEmpty('No vulnerabilities found', 'Try a different keyword or severity filter.'); document.getElementById('vuln-pagination').innerHTML = ''; return; }

    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    box.innerHTML = pageItems.map(c => `
      <div class="result-row" style="grid-template-columns:auto 1fr auto auto auto;">
        <div class="cvss-ring ${c.severity}">${c.cvss.toFixed(1)}</div>
        <div class="result-main">
          <div class="r-name">${SX.escapeHtml(c.id)}</div>
          <div class="r-desc">${SX.escapeHtml(c.description.slice(0, 140))}${c.description.length > 140 ? '…' : ''}</div>
          <div class="r-tags">${c.products.slice(0, 3).map(p => `<span class="tag-chip">${SX.escapeHtml(p)}</span>`).join('')}</div>
        </div>
        <div class="r-col"><span class="r-label">Severity</span>${SX.sevBadge(c.severity)}</div>
        <div class="r-col"><span class="r-label">Published</span>${SX.formatDateShort(new Date(c.published))}</div>
        <div class="r-col"><button class="btn btn-sm" data-id="${SX.escapeHtml(c.id)}">Details</button></div>
      </div>
    `).join('');

    box.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => openModal(items.find(i => i.id === b.dataset.id))));
    renderPagination(items.length, totalPages);
  }

  function renderPagination(total, totalPages) {
    const el = document.getElementById('vuln-pagination');
    let btns = '';
    for (let i = 1; i <= totalPages; i++) btns += `<button class="pg-btn ${i === page ? 'active' : ''}" data-p="${i}">${i}</button>`;
    el.innerHTML = `
      <span>${total} CVE${total === 1 ? '' : 's'}</span>
      <div class="pg-btns">
        <button class="pg-btn" id="v-prev" ${page === 1 ? 'disabled' : ''}>‹</button>${btns}<button class="pg-btn" id="v-next" ${page === totalPages ? 'disabled' : ''}>›</button>
      </div>`;
    el.querySelectorAll('button[data-p]').forEach(b => b.addEventListener('click', () => { page = +b.dataset.p; renderList(); }));
    document.getElementById('v-prev')?.addEventListener('click', () => { if (page > 1) { page--; renderList(); } });
    document.getElementById('v-next')?.addEventListener('click', () => { if (page < totalPages) { page++; renderList(); } });
  }

  function openModal(c) {
    if (!c) return;
    document.getElementById('vuln-modal-body').innerHTML = `
      <div class="flex items-center gap-10" style="margin-bottom:14px;">
        <div class="cvss-ring ${c.severity}">${c.cvss.toFixed(1)}</div>
        <div>
          <div style="font-weight:700;font-size:15px;">${SX.escapeHtml(c.id)}</div>
          ${SX.sevBadge(c.severity)}
        </div>
      </div>
      <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;">${SX.escapeHtml(c.description)}</p>
      <div class="info-list">
        <div class="info-row"><span class="ir-k">CVSS Score</span><span class="ir-v">${c.cvss.toFixed(1)}</span></div>
        <div class="info-row"><span class="ir-k">Published</span><span class="ir-v">${SX.formatDateShort(new Date(c.published))}</span></div>
        <div class="info-row"><span class="ir-k">Last Modified</span><span class="ir-v">${SX.formatDateShort(new Date(c.modified))}</span></div>
        <div class="info-row"><span class="ir-k">Affected Products</span><span class="ir-v">${c.products.length ? SX.escapeHtml(c.products.join(', ')) : '—'}</span></div>
      </div>
      ${c.references?.length ? `<div style="margin-top:14px;"><div class="ir-k" style="margin-bottom:6px;font-size:11.5px;color:var(--text-tertiary);">References</div>${c.references.map(r => `<div style="font-size:11.5px;margin-bottom:4px;"><a href="${SX.escapeHtml(r)}" target="_blank" rel="noopener" style="color:var(--brand-400);">${SX.escapeHtml(r)}</a></div>`).join('')}</div>` : ''}
    `;
    document.getElementById('vuln-modal-overlay').classList.add('open');
  }
  function closeModal() { document.getElementById('vuln-modal-overlay').classList.remove('open'); }

  return { init };
})();
