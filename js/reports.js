/* ==========================================================================
   SENTINEL-X — reports.js
   ========================================================================== */

const SXReports = (() => {

  function init() {
    const today = new Date();
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    document.getElementById('rp-to').value = today.toISOString().slice(0, 10);
    document.getElementById('rp-from').value = weekAgo.toISOString().slice(0, 10);

    document.getElementById('rp-generate').addEventListener('click', generate);
    document.getElementById('rp-print').addEventListener('click', () => {
      if (!document.getElementById('report-output').querySelector('.report-doc')) { SX.toast('Generate first', 'Create a report before printing.', 'warn'); return; }
      window.print();
    });
    document.getElementById('rp-export').addEventListener('click', exportHtml);
  }

  async function generate() {
    const out = document.getElementById('report-output');
    out.innerHTML = `<div class="skel" style="height:340px;border-radius:12px;"></div>`;

    const [threatRes, incidents] = await Promise.all([
      SXApi.getThreatData(),
      Promise.resolve(SX.storeGet('incidents', [])),
    ]);

    const threats = threatRes.items;
    const cves = SXApi.DEMO_CVES;
    const title = document.getElementById('rp-title').value || 'Security Summary';
    const from = document.getElementById('rp-from').value;
    const to = document.getElementById('rp-to').value;

    const critical = threats.filter(t => t.severity === 'critical').length;
    const incOpen = incidents.filter(i => i.status !== 'Resolved').length;
    const incResolved = incidents.filter(i => i.status === 'Resolved').length;
    const vulnCritical = cves.filter(c => c.severity === 'critical').length;

    const countries = [...new Set(threats.map(t => t.location.split(',').pop().trim()))];

    const incThreats = document.getElementById('rp-inc-threats').checked;
    const incIncidents = document.getElementById('rp-inc-incidents').checked;
    const incVulns = document.getElementById('rp-inc-vulns').checked;
    const incGeo = document.getElementById('rp-inc-geo').checked;
    const incFindings = document.getElementById('rp-inc-findings').checked;

    out.innerHTML = `
      <div class="report-doc" id="report-doc-inner">
        <h1>${SX.escapeHtml(title)}</h1>
        <div class="rd-meta">SENTINEL-X Security Operations Center &middot; ${SX.escapeHtml(from)} to ${SX.escapeHtml(to)} &middot; Generated ${new Date().toLocaleString()}</div>

        <div class="rd-kpis">
          <div class="rd-kpi"><b>${threats.length}</b><span>Active Threats</span></div>
          <div class="rd-kpi"><b>${critical}</b><span>Critical</span></div>
          <div class="rd-kpi"><b>${incidents.length}</b><span>Incidents</span></div>
          <div class="rd-kpi"><b>${cves.length}</b><span>Tracked CVEs</span></div>
        </div>

        ${incThreats ? `
        <h2>Threat Statistics</h2>
        <table>
          <thead><tr><th>Category</th><th>Count</th></tr></thead>
          <tbody>${Object.entries(countBy(threats, 'type')).map(([k, v]) => `<tr><td>${SX.escapeHtml(k)}</td><td>${v}</td></tr>`).join('')}</tbody>
        </table>` : ''}

        ${incIncidents ? `
        <h2>Incident Statistics</h2>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            <tr><td>Open (New / Investigating / Contained)</td><td>${incOpen}</td></tr>
            <tr><td>Resolved</td><td>${incResolved}</td></tr>
          </tbody>
        </table>` : ''}

        ${incVulns ? `
        <h2>Vulnerability Statistics</h2>
        <table>
          <thead><tr><th>Severity</th><th>Count</th></tr></thead>
          <tbody>${Object.entries(countBy(cves, 'severity')).map(([k, v]) => `<tr><td>${SX.escapeHtml(k)}</td><td>${v}</td></tr>`).join('')}</tbody>
        </table>` : ''}

        ${incGeo ? `
        <h2>Geographic Information</h2>
        <p style="font-size:12.5px;">Threat events observed across <strong>${countries.length}</strong> countries: ${SX.escapeHtml(countries.join(', '))}.</p>` : ''}

        ${incFindings ? `
        <h2>Key Findings</h2>
        <ul>
          <li>${critical} threat event${critical === 1 ? '' : 's'} classified as critical severity require immediate analyst attention.</li>
          <li>${incOpen} incident${incOpen === 1 ? '' : 's'} remain open across New, Investigating, or Contained status.</li>
          <li>${vulnCritical} tracked CVEs carry a critical CVSS rating and should be prioritized for patching.</li>
          <li>Threat activity was observed across ${countries.length} distinct countries in the current reporting window.</li>
        </ul>` : ''}

        <div class="rd-meta" style="margin-top:20px;">This report combines demonstration threat data with live vulnerability data where available. Clearly-labeled demo figures should not be presented as real-world security events.</div>
      </div>
    `;
    SX.toast('Report generated', 'Preview is ready — print or export below.', 'ok');
  }

  function countBy(arr, key) {
    const out = {};
    arr.forEach(i => { out[i[key]] = (out[i[key]] || 0) + 1; });
    return out;
  }

  function exportHtml() {
    const inner = document.getElementById('report-doc-inner');
    if (!inner) { SX.toast('Generate first', 'Create a report before exporting.', 'warn'); return; }
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SENTINEL-X Report</title>
      <style>body{font-family:Inter,sans-serif;padding:40px;color:#10141c;} table{width:100%;border-collapse:collapse;} th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;} h2{margin-top:22px;border-bottom:2px solid #10141c;padding-bottom:6px;font-size:14px;}</style>
      </head><body>${inner.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sentinelx-report-${Date.now()}.html`;
    a.click();
    SX.toast('Report exported', 'Downloaded as a standalone HTML file.', 'ok');
  }

  return { init };
})();
