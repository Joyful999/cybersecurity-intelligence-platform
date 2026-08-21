/* ==========================================================================
   SENTINEL-X — network.js
   Network telemetry is presented as clearly-labeled demonstration data;
   swap fetchNetworkTelemetry() for a real backend/agent feed in production.
   ========================================================================== */

const SXNetwork = (() => {

  async function init() {
    document.getElementById('net-stats').innerHTML = Array.from({ length: 4 }).map(() => `<div class="net-stat"><div class="skel" style="height:12px;width:50%;margin-bottom:10px;"></div><div class="skel" style="height:22px;width:70%;"></div></div>`).join('');

    const threatRes = await SXApi.getThreatData();
    const threats = threatRes.items;

    paintStats(threats);
    paintTrafficChart();
    paintProtocolChart();
    paintTopCountries(threats);
    paintTopIps(threats);
    paintThreatDistChart(threats);
  }

  function paintStats(threats) {
    const stats = [
      { label: 'Network Status', val: 'Operational', pct: 96 },
      { label: 'Active Connections', val: (1200 + threats.length * 34).toLocaleString(), pct: 68 },
      { label: 'Requests / min', val: (4200 + threats.length * 90).toLocaleString(), pct: 74 },
      { label: 'Open Ports Monitored', val: 128, pct: 40 },
    ];
    document.getElementById('net-stats').innerHTML = stats.map(s => `
      <div class="net-stat">
        <div class="ns-label">${s.label}</div>
        <div class="ns-val">${s.val}</div>
        <div class="ns-bar"><div class="ns-bar-fill" style="width:${s.pct}%"></div></div>
      </div>
    `).join('');
  }

  function paintTrafficChart() {
    const ctx = document.getElementById('chart-traffic');
    if (!ctx || typeof Chart === 'undefined') return;
    const labels = Array.from({ length: 30 }).map((_, i) => `${29 - i}m`);
    const data = labels.map(() => Math.round(3800 + Math.random() * 1800));
    new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Requests/min', data, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', borderWidth: 2, tension: 0.3, fill: true, pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { color: '#5c667a', maxTicksLimit: 8, font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c667a', font: { size: 10 } } } } }
    });
  }

  function paintProtocolChart() {
    const ctx = document.getElementById('chart-protocols');
    if (!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['HTTPS', 'DNS', 'SSH', 'HTTP', 'Other'],
        datasets: [{ data: [52, 21, 11, 9, 7], backgroundColor: ['#4f7cff', '#38bdf8', '#22c58e', '#f0b429', '#5c667a'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9aa3b5', boxWidth: 10, font: { size: 10.5 } } } } }
    });
  }

  function paintThreatDistChart(threats) {
    const ctx = document.getElementById('chart-threat-dist');
    if (!ctx || typeof Chart === 'undefined') return;
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    threats.forEach(t => counts[t.severity]++);
    new Chart(ctx, {
      type: 'bar',
      data: { labels: ['Critical', 'High', 'Medium', 'Low'], datasets: [{ data: [counts.critical, counts.high, counts.medium, counts.low], backgroundColor: ['#f0453a', '#ff8a3d', '#f0b429', '#38bdf8'], borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { color: '#9aa3b5', font: { size: 10.5 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c667a', font: { size: 10 }, stepSize: 1 } } } }
    });
  }

  function paintTopCountries(threats) {
    const counts = {};
    threats.forEach(t => { const c = t.location.split(',').pop().trim(); counts[c] = (counts[c] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(...entries.map(e => e[1]), 1);
    document.getElementById('net-top-countries').innerHTML = entries.length ? entries.map(([n, c]) => `
      <div class="mini-row"><div class="mr-name"><span class="flag"></span>${SX.escapeHtml(n)}</div>
      <div class="flex items-center"><div class="mini-bar-bg"><div class="mini-bar-fill" style="width:${(c / max) * 100}%"></div></div><span class="mr-val" style="margin-left:10px;">${c}</span></div></div>
    `).join('') : SX.stateEmpty();
  }

  function paintTopIps(threats) {
    const sorted = threats.slice().sort((a, b) => (b.severity === 'critical') - (a.severity === 'critical')).slice(0, 6);
    document.getElementById('net-top-ips').innerHTML = sorted.length ? sorted.map(t => `
      <div class="mini-row"><div class="mr-name mono" style="font-size:11.5px;">${SX.escapeHtml(t.ip)}</div>${SX.sevBadge(t.severity)}</div>
    `).join('') : SX.stateEmpty();
  }

  return { init };
})();
