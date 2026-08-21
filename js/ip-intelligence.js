/* ==========================================================================
   SENTINEL-X — ip-intelligence.js
   ========================================================================== */

const SXIpIntel = (() => {

  let ipMap, lastResult = null;

  function init() {
    document.getElementById('ip-analyze').addEventListener('click', () => runLookup());
    document.getElementById('ip-input').addEventListener('keydown', e => { if (e.key === 'Enter') runLookup(); });
    document.querySelectorAll('.ip-quick button').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.ip === 'my-ip') { document.getElementById('ip-input').value = ''; runLookup(true); }
        else { document.getElementById('ip-input').value = b.dataset.ip; runLookup(); }
      });
    });
    document.getElementById('ip-copy').addEventListener('click', copyIp);
    document.getElementById('ip-export').addEventListener('click', exportReport);

    const params = new URLSearchParams(location.search);
    if (params.get('ip')) { document.getElementById('ip-input').value = params.get('ip'); runLookup(); }
  }

  function showError(msg) {
    const el = document.getElementById('ip-error');
    el.textContent = msg;
    el.style.display = 'block';
  }
  function clearError() { document.getElementById('ip-error').style.display = 'none'; }

  async function runLookup(myIp = false) {
    clearError();
    const raw = document.getElementById('ip-input').value.trim();

    if (!myIp) {
      if (!raw) { showError('Enter an IPv4 or IPv6 address to analyze.'); return; }
      if (!SX.isValidIP(raw)) { showError('That doesn\'t look like a valid IPv4 or IPv6 address. Check the format and try again.'); return; }
    }

    document.getElementById('ip-loading').style.display = 'block';
    document.getElementById('ip-results').style.display = 'none';
    document.getElementById('ip-analyze').disabled = true;

    try {
      const data = await SXApi.getIPInformation(myIp ? '' : raw);
      lastResult = data;
      paintResult(data);
    } catch (err) {
      showError('Unable to retrieve intelligence data. Please try again.');
      SX.toast('Lookup failed', err.message || 'Network error', 'err');
    } finally {
      document.getElementById('ip-loading').style.display = 'none';
      document.getElementById('ip-analyze').disabled = false;
    }
  }

  function paintResult(d) {
    document.getElementById('ip-results').style.display = 'block';
    document.getElementById('ip-result-title').textContent = `Results for ${d.ip}`;
    const badge = document.getElementById('ip-source-badge');
    badge.textContent = d.meta.source === 'live' ? 'LIVE DATA' : 'DEMO DATA';
    badge.className = `badge ${d.meta.source === 'live' ? 'badge-ok' : 'badge-neutral'}`;

    document.getElementById('ip-info-list').innerHTML = [
      ['IP Address', d.ip], ['Type', d.type || '—'], ['Country', `${d.country || '—'} (${d.countryCode || '—'})`],
      ['Region', d.region || '—'], ['City', d.city || '—'],
      ['Latitude', d.latitude?.toFixed?.(4) ?? '—'], ['Longitude', d.longitude?.toFixed?.(4) ?? '—'],
      ['ISP', d.isp || '—'], ['Organization', d.org || '—'], ['ASN', d.asn || '—'],
      ['Timezone', `${d.timezone || '—'} ${d.utc ? `(UTC${d.utc})` : ''}`],
    ].map(([k, v]) => `<div class="info-row"><span class="ir-k">${k}</span><span class="ir-v">${SX.escapeHtml(v)}</span></div>`).join('');

    // Security flags
    const flags = [
      { label: 'Proxy', on: d.security.proxy }, { label: 'VPN', on: d.security.vpn },
      { label: 'Tor', on: d.security.tor }, { label: 'Hosting/Datacenter', on: d.security.hosting },
      { label: 'Anonymous', on: d.security.anonymous },
    ];
    document.getElementById('ip-sec-flags').innerHTML = flags.map(f => `
      <div class="sec-flag"><span class="sf-dot" style="background:${f.on ? 'var(--sev-high)' : 'var(--status-ok)'}"></span>${f.label}: <b style="margin-left:auto;">${f.on ? 'Detected' : 'Clear'}</b></div>
    `).join('');

    const riskCount = flags.filter(f => f.on).length;
    const score = Math.min(100, riskCount * 22 + (d.meta.source === 'demo' ? 5 : 0));
    const scoreColor = score >= 60 ? 'var(--sev-critical)' : score >= 30 ? 'var(--sev-medium)' : 'var(--status-ok)';
    document.getElementById('ip-score-fill').style.width = score + '%';
    document.getElementById('ip-score-fill').style.background = scoreColor;
    document.getElementById('ip-score-label').textContent = `${score} / 100`;

    // Map
    if (d.latitude && d.longitude) {
      if (ipMap) ipMap.remove();
      ipMap = L.map('ip-map', { zoomControl: false, dragging: true, scrollWheelZoom: false }).setView([d.latitude, d.longitude], 8);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(ipMap);
      L.circleMarker([d.latitude, d.longitude], { radius: 9, color: '#4f7cff', fillColor: '#4f7cff', fillOpacity: 0.5, weight: 2 }).addTo(ipMap)
        .bindPopup(`<div class="map-popup"><div class="mp-title">${SX.escapeHtml(d.city || d.country)}</div></div>`);
    }
  }

  function copyIp() {
    if (!lastResult) return;
    navigator.clipboard?.writeText(lastResult.ip).then(() => SX.toast('Copied', `${lastResult.ip} copied to clipboard.`, 'ok'));
  }

  function exportReport() {
    if (!lastResult) return;
    const d = lastResult;
    const lines = [
      `SENTINEL-X IP INTELLIGENCE REPORT`, `Generated: ${new Date().toLocaleString()}`, `Data source: ${d.meta.source.toUpperCase()}`, '',
      `IP: ${d.ip}`, `Type: ${d.type}`, `Country: ${d.country} (${d.countryCode})`, `Region: ${d.region}`, `City: ${d.city}`,
      `Coordinates: ${d.latitude}, ${d.longitude}`, `ISP: ${d.isp}`, `Organization: ${d.org}`, `ASN: ${d.asn}`, `Timezone: ${d.timezone}`, '',
      `SECURITY`, `Proxy: ${d.security.proxy}`, `VPN: ${d.security.vpn}`, `Tor: ${d.security.tor}`, `Hosting: ${d.security.hosting}`, `Anonymous: ${d.security.anonymous}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sentinelx-ip-report-${d.ip}.txt`;
    a.click();
    SX.toast('Report exported', 'IP intelligence report downloaded.', 'ok');
  }

  return { init };
})();
