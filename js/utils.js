/* ==========================================================================
   SENTINEL-X — utils.js
   Shared helper functions used across every page.
   ========================================================================== */

const SX = (() => {

  /* ---------------- Storage ---------------- */
  const STORAGE_PREFIX = 'sentinelx:';

  function storeGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function storeSet(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('SX storage error', e);
      return false;
    }
  }

  /* ---------------- Formatting ---------------- */
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDate(date = new Date()) {
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateShort(date = new Date()) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function timeAgo(iso) {
    const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function uid(prefix = 'ID') {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  /* ---------------- Validation ---------------- */
  function isValidIPv4(ip) {
    const re = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    return re.test(ip);
  }
  function isValidIPv6(ip) {
    const re = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
    return re.test(ip);
  }
  function isValidIP(ip) { return isValidIPv4(ip) || isValidIPv6(ip); }

  /* ---------------- Severity helpers ---------------- */
  const SEV_ORDER = ['critical', 'high', 'medium', 'low'];
  function sevColorVar(sev) {
    const map = { critical: '--sev-critical', high: '--sev-high', medium: '--sev-medium', low: '--sev-low' };
    return map[sev?.toLowerCase()] || '--sev-low';
  }
  function sevBadge(sev) {
    const s = (sev || 'low').toLowerCase();
    return `<span class="badge badge-${s}">${escapeHtml(s)}</span>`;
  }
  function cvssToSeverity(score) {
    if (score >= 9) return 'critical';
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /* ---------------- Toasts ---------------- */
  function toast(title, desc = '', type = 'ok', duration = 4200) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="t-title">${escapeHtml(title)}</div>${desc ? `<div class="t-desc">${escapeHtml(desc)}</div>` : ''}`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease, transform 200ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 220);
    }, duration);
  }

  /* ---------------- Loading / Empty / Error state helpers ---------------- */
  function skeletonRows(n = 4, height = 46) {
    return Array.from({ length: n }).map(() =>
      `<div class="skel" style="height:${height}px;border-radius:10px;margin-bottom:10px;"></div>`
    ).join('');
  }

  function stateEmpty(title = 'No data available', desc = 'There is nothing to show for the current filters.') {
    return `<div class="state-block">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>
      <div class="title">${escapeHtml(title)}</div>
      <div class="desc">${escapeHtml(desc)}</div>
    </div>`;
  }

  function stateError(desc = 'Unable to retrieve intelligence data. Please try again.') {
    return `<div class="state-block error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
      <div class="title">Connection issue</div>
      <div class="desc">${escapeHtml(desc)}</div>
    </div>`;
  }

  /* ---------------- Country helpers (demo geo lookup) ---------------- */
  const COUNTRY_COORDS = {
    US: [38.9, -77.0], CN: [39.9, 116.4], RU: [55.75, 37.6], DE: [52.5, 13.4], BR: [-15.8, -47.9],
    IN: [28.6, 77.2], GB: [51.5, -0.1], FR: [48.85, 2.35], NL: [52.37, 4.9], KR: [37.55, 127.0],
    JP: [35.68, 139.7], UA: [50.45, 30.5], VN: [21.0, 105.8], IR: [35.7, 51.4], NG: [9.08, 7.4],
    ZA: [-25.7, 28.2], SG: [1.35, 103.8], CA: [45.4, -75.7], AU: [-35.3, 149.1], MX: [19.4, -99.1],
    ID: [-6.2, 106.8], TR: [39.9, 32.9], PL: [52.2, 21.0], SE: [59.3, 18.1], IT: [41.9, 12.5]
  };

  return {
    storeGet, storeSet, formatTime, formatDate, formatDateShort, timeAgo, escapeHtml, debounce, uid,
    isValidIPv4, isValidIPv6, isValidIP, SEV_ORDER, sevColorVar, sevBadge, cvssToSeverity,
    toast, skeletonRows, stateEmpty, stateError, COUNTRY_COORDS
  };
})();
