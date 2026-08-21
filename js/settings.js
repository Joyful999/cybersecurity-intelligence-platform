/* ==========================================================================
   SENTINEL-X — settings.js
   ========================================================================== */

const SXSettings = (() => {

  function init() {
    // Theme
    const theme = SX.storeGet('theme', 'dark');
    document.querySelectorAll('.theme-opt').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === theme);
      el.addEventListener('click', () => {
        document.querySelectorAll('.theme-opt').forEach(o => o.classList.remove('active'));
        el.classList.add('active');
        SX.storeSet('theme', el.dataset.theme);
        document.documentElement.setAttribute('data-theme', el.dataset.theme);
        SX.toast('Theme updated', `Switched to ${el.dataset.theme} mode.`, 'ok');
      });
    });

    // Compact mode
    const compact = document.getElementById('set-compact');
    compact.checked = SX.storeGet('compactMode', false);
    compact.addEventListener('change', () => {
      SX.storeSet('compactMode', compact.checked);
      document.documentElement.setAttribute('data-compact', compact.checked ? 'true' : 'false');
    });

    // Notification prefs
    bindToggle('set-alert-threat', 'alertThreat', true);
    bindToggle('set-alert-vuln', 'alertVuln', true);
    bindToggle('set-alert-system', 'alertSystem', true);

    // Data
    const refresh = document.getElementById('set-refresh');
    refresh.value = SX.storeGet('refreshInterval', '30');
    refresh.addEventListener('change', () => SX.storeSet('refreshInterval', refresh.value));
    loadApiStatus();

    // Security
    const session = document.getElementById('set-session');
    session.value = SX.storeGet('sessionTimeout', '30');
    session.addEventListener('change', () => SX.storeSet('sessionTimeout', session.value));

    const twofa = document.getElementById('set-2fa');
    twofa.checked = SX.storeGet('twofaEnabled', false);
    document.getElementById('twofa-panel').style.display = twofa.checked ? 'block' : 'none';
    twofa.addEventListener('change', () => {
      SX.storeSet('twofaEnabled', twofa.checked);
      document.getElementById('twofa-panel').style.display = twofa.checked ? 'block' : 'none';
    });

    document.getElementById('prof-last-login').textContent = new Date().toLocaleString();

    document.getElementById('settings-save').addEventListener('click', () => {
      SX.toast('Settings saved', 'Your preferences have been updated.', 'ok');
    });

    // Settings nav smooth-scroll + active state
    document.querySelectorAll('.settings-nav a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.settings-nav a').forEach(l => l.classList.remove('active'));
        a.classList.add('active');
        document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function bindToggle(id, key, def) {
    const el = document.getElementById(id);
    el.checked = SX.storeGet(key, def);
    el.addEventListener('change', () => SX.storeSet(key, el.checked));
  }

  async function loadApiStatus() {
    const box = document.getElementById('api-status-list');
    box.innerHTML = `<div class="skel" style="height:14px;width:120px;"></div><div class="skel" style="height:14px;width:120px;"></div>`;
    const checks = [
      { name: 'ipwho.is (IP Intel)', test: () => SXApi.getIPInformation('8.8.8.8') },
      { name: 'NVD (CVE Data)', test: () => SXApi.getVulnerabilities({ resultsPerPage: 1 }) },
    ];
    const results = await Promise.all(checks.map(async c => {
      try { const r = await c.test(); return { name: c.name, ok: r.meta.source === 'live' }; }
      catch { return { name: c.name, ok: false }; }
    }));
    box.innerHTML = results.map(r => `
      <div class="flex items-center gap-6" style="font-size:11.5px;"><span class="sb-ind" style="background:${r.ok ? 'var(--status-ok)' : 'var(--sev-medium)'}"></span>${SX.escapeHtml(r.name)} — <b>${r.ok ? 'Connected' : 'Fallback (demo)'}</b></div>
    `).join('');
  }

  return { init };
})();
