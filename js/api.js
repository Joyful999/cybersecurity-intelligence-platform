/* ==========================================================================
   SENTINEL-X — api.js
   Centralized API layer. Every external network call in the application
   goes through this module so endpoints, timeouts, and fallback behavior
   stay in one place.

   Live data sources (no API key required, browser-callable):
     - IP geolocation / security  : https://ipwho.is
     - CVE / vulnerability records: https://services.nvd.nist.gov  (NVD, NIST)
     - Country reference data     : https://restcountries.com

   If a request fails (offline sandbox, CORS block, rate limit) each function
   falls back to a clearly-labeled DEMO dataset (`meta.source = "demo"`) so the
   UI never renders a blank panel. Swap in a backend proxy for endpoints that
   need a secret key — none are required for the sources above.
   ========================================================================== */

const SXApi = (() => {

  const ENDPOINTS = {
    ipInfo: (ip) => `https://ipwho.is/${ip ? encodeURIComponent(ip) : ''}`,
    nvdCves: (params) => `https://services.nvd.nist.gov/rest/json/cves/2.0?${params}`,
    countries: 'https://restcountries.com/v3.1/all?fields=name,capital,region,population,flags,latlng,cca2',
  };

  const TIMEOUT_MS = 8000;

  async function fetchJSON(url, opts = {}) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeout || TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(t);
      throw err;
    }
  }

  /* ================= IP INTELLIGENCE ================= */

  async function getIPInformation(ip = '') {
    try {
      const data = await fetchJSON(ENDPOINTS.ipInfo(ip));
      if (!data || data.success === false) throw new Error(data?.message || 'lookup failed');
      return {
        meta: { source: 'live', provider: 'ipwho.is' },
        ip: data.ip,
        type: data.type,
        country: data.country,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        postal: data.postal,
        capital: data.capital,
        isp: data.connection?.isp || data.connection?.org || 'Unknown',
        org: data.connection?.org || 'Unknown',
        asn: data.connection?.asn ? `AS${data.connection.asn}` : 'Unknown',
        timezone: data.timezone?.id || 'Unknown',
        utc: data.timezone?.utc || '',
        security: {
          proxy: !!data.security?.proxy,
          vpn: !!data.security?.vpn,
          tor: !!data.security?.tor,
          hosting: !!data.security?.hosting,
          anonymous: !!data.security?.anonymous,
        }
      };
    } catch (err) {
      return buildDemoIP(ip, err);
    }
  }

  function buildDemoIP(ip, err) {
    const demo = {
      '8.8.8.8': { country: 'United States', countryCode: 'US', region: 'California', city: 'Mountain View', lat: 37.4, lon: -122.07, isp: 'Google LLC', org: 'Google Public DNS', asn: 'AS15169' },
      '1.1.1.1': { country: 'United States', countryCode: 'US', region: 'California', city: 'Los Angeles', lat: 34.05, lon: -118.24, isp: 'Cloudflare, Inc.', org: 'APNIC and Cloudflare DNS', asn: 'AS13335' },
    };
    const base = demo[ip] || { country: 'Netherlands', countryCode: 'NL', region: 'North Holland', city: 'Amsterdam', lat: 52.37, lon: 4.9, isp: 'DigitalOcean, LLC', org: 'DigitalOcean', asn: 'AS14061' };
    return {
      meta: { source: 'demo', provider: 'fallback', reason: err?.message || 'network unavailable' },
      ip: ip || '203.0.113.42',
      type: SX.isValidIPv6(ip) ? 'IPv6' : 'IPv4',
      country: base.country, countryCode: base.countryCode, region: base.region, city: base.city,
      latitude: base.lat, longitude: base.lon, postal: '----', capital: base.city,
      isp: base.isp, org: base.org, asn: base.asn, timezone: 'UTC', utc: '+00:00',
      security: { proxy: false, vpn: Math.random() > 0.7, tor: false, hosting: Math.random() > 0.5, anonymous: false }
    };
  }

  /* ================= CVE / VULNERABILITIES ================= */

  async function getVulnerabilities({ keyword = '', severity = '', resultsPerPage = 20, startIndex = 0 } = {}) {
    try {
      const params = new URLSearchParams();
      params.set('resultsPerPage', resultsPerPage);
      params.set('startIndex', startIndex);
      if (keyword) params.set('keywordSearch', keyword);
      if (severity) params.set('cvssV3Severity', severity.toUpperCase());
      const data = await fetchJSON(ENDPOINTS.nvdCves(params.toString()));
      const items = (data.vulnerabilities || []).map(normalizeNvdItem);
      if (!items.length) throw new Error('empty result set');
      return { meta: { source: 'live', provider: 'nvd.nist.gov', total: data.totalResults ?? items.length }, items };
    } catch (err) {
      return { meta: { source: 'demo', provider: 'fallback', reason: err?.message || 'network unavailable', total: DEMO_CVES.length }, items: filterDemoCves({ keyword, severity }) };
    }
  }

  function normalizeNvdItem(entry) {
    const c = entry.cve;
    const desc = (c.descriptions || []).find(d => d.lang === 'en')?.value || 'No description available.';
    const metric = c.metrics?.cvssMetricV31?.[0] || c.metrics?.cvssMetricV30?.[0] || c.metrics?.cvssMetricV2?.[0];
    const score = metric?.cvssData?.baseScore ?? 0;
    const severity = (metric?.cvssData?.baseSeverity || SX.cvssToSeverity(score)).toLowerCase();
    const products = (c.configurations || [])
      .flatMap(cfg => cfg.nodes || [])
      .flatMap(n => n.cpeMatch || [])
      .slice(0, 4)
      .map(m => m.criteria?.split(':')[4] || 'unknown');
    return {
      id: c.id,
      description: desc,
      severity,
      cvss: score,
      published: c.published,
      modified: c.lastModified,
      products: [...new Set(products)].slice(0, 4),
      references: (c.references || []).slice(0, 5).map(r => r.url),
    };
  }

  /* ================= COUNTRY / GEO REFERENCE ================= */

  let _countryCache = null;
  async function getCountryData() {
    if (_countryCache) return _countryCache;
    try {
      const data = await fetchJSON(ENDPOINTS.countries);
      const items = data.map(c => ({
        code: c.cca2, name: c.name?.common, region: c.region,
        population: c.population, flag: c.flags?.svg, latlng: c.latlng,
      }));
      _countryCache = { meta: { source: 'live', provider: 'restcountries.com' }, items };
      return _countryCache;
    } catch (err) {
      _countryCache = { meta: { source: 'demo', reason: err?.message }, items: DEMO_COUNTRIES };
      return _countryCache;
    }
  }

  /* ================= THREAT INTELLIGENCE (demo-labeled, structured for future live feed) ================= */

  async function getThreatData({ category = '', severity = '', country = '', query = '' } = {}) {
    // No open, keyless, browser-callable "raw threat event" API is broadly available,
    // so this is served from a structured demo dataset. Swap the body of this function
    // for a fetch() call to a licensed threat-intel feed (e.g. via a backend proxy) in production.
    await new Promise(r => setTimeout(r, 260));
    let items = DEMO_THREATS.slice();
    if (category) items = items.filter(t => t.type === category);
    if (severity) items = items.filter(t => t.severity === severity);
    if (country) items = items.filter(t => t.countryCode === country);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(t => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q) || t.ip.includes(q));
    }
    return { meta: { source: 'demo', reason: 'no keyless public raw-event feed available client-side' }, items };
  }

  async function getSecurityAdvisories() {
    try {
      // GitHub's global security advisory database is public and CORS-enabled.
      const data = await fetchJSON('https://api.github.com/advisories?per_page=12');
      const items = data.map(a => ({
        id: a.ghsa_id, summary: a.summary, severity: (a.severity || 'medium').toLowerCase(),
        published: a.published_at, url: a.html_url, cve: a.cve_id,
      }));
      return { meta: { source: 'live', provider: 'github.com/advisories' }, items };
    } catch (err) {
      return { meta: { source: 'demo', reason: err?.message }, items: DEMO_ADVISORIES };
    }
  }

  /* ================= DEMO DATASETS (clearly labeled) ================= */

  const DEMO_THREATS = [
    { id: 'THR-88213', name: 'Emotet Botnet C2 Beacon', type: 'Botnet', severity: 'critical', location: 'Moscow, Russia', countryCode: 'RU', lat: 55.75, lon: 37.6, ip: '185.220.101.45', source: 'Demo Feed', ts: offsetIso(-4) },
    { id: 'THR-88214', name: 'Credential Phishing Kit — Banking Lure', type: 'Phishing', severity: 'high', location: 'Sao Paulo, Brazil', countryCode: 'BR', lat: -23.55, lon: -46.63, ip: '191.96.12.204', source: 'Demo Feed', ts: offsetIso(-19) },
    { id: 'THR-88215', name: 'SSH Brute Force Sweep', type: 'Brute Force', severity: 'medium', location: 'Shenzhen, China', countryCode: 'CN', lat: 22.54, lon: 114.05, ip: '58.220.11.83', source: 'Demo Feed', ts: offsetIso(-33) },
    { id: 'THR-88216', name: 'Log4Shell Exploit Attempt', type: 'Exploit', severity: 'critical', location: 'Frankfurt, Germany', countryCode: 'DE', lat: 50.11, lon: 8.68, ip: '85.214.63.10', source: 'Demo Feed', ts: offsetIso(-51) },
    { id: 'THR-88217', name: 'Volumetric UDP DDoS', type: 'DDoS', severity: 'high', location: 'Singapore', countryCode: 'SG', lat: 1.35, lon: 103.8, ip: '119.81.34.9', source: 'Demo Feed', ts: offsetIso(-72) },
    { id: 'THR-88218', name: 'Suspicious Tor Exit Node Traffic', type: 'Suspicious IP', severity: 'low', location: 'Amsterdam, Netherlands', countryCode: 'NL', lat: 52.37, lon: 4.9, ip: '185.220.102.8', source: 'Demo Feed', ts: offsetIso(-95) },
    { id: 'THR-88219', name: 'Malicious Typosquat Domain', type: 'Malicious Domain', severity: 'medium', location: 'Kyiv, Ukraine', countryCode: 'UA', lat: 50.45, lon: 30.5, ip: '5.188.10.77', source: 'Demo Feed', ts: offsetIso(-121) },
    { id: 'THR-88220', name: 'Ransomware Dropper — Loader Stage', type: 'Malware', severity: 'critical', location: 'Lagos, Nigeria', countryCode: 'NG', lat: 6.52, lon: 3.38, ip: '105.112.4.19', source: 'Demo Feed', ts: offsetIso(-140) },
    { id: 'THR-88221', name: 'Customer Records Exfiltration Attempt', type: 'Data Breach', severity: 'critical', location: 'Seoul, South Korea', countryCode: 'KR', lat: 37.55, lon: 127.0, ip: '121.66.5.14', source: 'Demo Feed', ts: offsetIso(-162) },
    { id: 'THR-88222', name: 'Port Scan — Full TCP Sweep', type: 'Suspicious IP', severity: 'low', location: 'Tehran, Iran', countryCode: 'IR', lat: 35.7, lon: 51.4, ip: '5.160.44.2', source: 'Demo Feed', ts: offsetIso(-188) },
    { id: 'THR-88223', name: 'Mirai Variant Beaconing', type: 'Botnet', severity: 'high', location: 'Hanoi, Vietnam', countryCode: 'VN', lat: 21.0, lon: 105.8, ip: '113.161.5.22', source: 'Demo Feed', ts: offsetIso(-210) },
    { id: 'THR-88224', name: 'Fake Invoice Phishing Campaign', type: 'Phishing', severity: 'medium', location: 'London, United Kingdom', countryCode: 'GB', lat: 51.5, lon: -0.1, ip: '81.2.69.142', source: 'Demo Feed', ts: offsetIso(-240) },
  ];

  const DEMO_ADVISORIES = [
    { id: 'GHSA-DEMO-0001', summary: 'Improper input validation in a widely used JSON parsing library', severity: 'high', published: offsetIso(-1500), url: '#', cve: 'CVE-2024-DEMO1' },
    { id: 'GHSA-DEMO-0002', summary: 'Server-side request forgery in an image-processing dependency', severity: 'critical', published: offsetIso(-3000), url: '#', cve: 'CVE-2024-DEMO2' },
  ];

  const DEMO_CVES = [
    { id: 'CVE-2024-38063', description: 'A remote code execution vulnerability exists in the Windows TCP/IP stack due to improper handling of IPv6 packets.', severity: 'critical', cvss: 9.8, published: offsetIso(-9000), modified: offsetIso(-500), products: ['windows_11', 'windows_server_2022'], references: ['https://msrc.microsoft.com/'] },
    { id: 'CVE-2024-3094', description: 'A supply-chain backdoor was introduced into a widely used compression library, allowing SSH authentication bypass under specific conditions.', severity: 'critical', cvss: 10.0, published: offsetIso(-11000), modified: offsetIso(-2000), products: ['xz_utils', 'liblzma'], references: ['https://www.cisa.gov/'] },
    { id: 'CVE-2023-44487', description: 'The HTTP/2 protocol allows a denial of service via rapid stream cancellation, exhausting server resources.', severity: 'high', cvss: 7.5, published: offsetIso(-15000), modified: offsetIso(-4000), products: ['nginx', 'apache_httpd', 'envoy'], references: ['https://www.cve.org/'] },
    { id: 'CVE-2024-21413', description: 'A vulnerability in Outlook allows bypassing the Protected View via a crafted hyperlink, leading to NTLM credential leakage.', severity: 'high', cvss: 9.1, published: offsetIso(-8000), modified: offsetIso(-1500), products: ['office_outlook'], references: ['https://msrc.microsoft.com/'] },
    { id: 'CVE-2023-4863', description: 'A heap buffer overflow in the WebP image library allows arbitrary code execution via a crafted image.', severity: 'critical', cvss: 8.8, published: offsetIso(-17000), modified: offsetIso(-6000), products: ['libwebp', 'chrome', 'firefox'], references: ['https://nvd.nist.gov/'] },
    { id: 'CVE-2024-6387', description: 'A signal handler race condition in OpenSSH server may allow unauthenticated remote code execution.', severity: 'critical', cvss: 8.1, published: offsetIso(-4000), modified: offsetIso(-300), products: ['openssh'], references: ['https://www.openssh.com/'] },
    { id: 'CVE-2023-38831', description: 'WinRAR mishandles the processing of a crafted archive, allowing execution of arbitrary code when a benign file is opened.', severity: 'high', cvss: 7.8, published: offsetIso(-20000), modified: offsetIso(-8000), products: ['winrar'], references: ['https://www.win-rar.com/'] },
    { id: 'CVE-2022-22965', description: 'Spring Framework allows remote code execution via data binding on JDK 9 or higher (Spring4Shell).', severity: 'critical', cvss: 9.8, published: offsetIso(-40000), modified: offsetIso(-30000), products: ['spring_framework'], references: ['https://spring.io/'] },
    { id: 'CVE-2021-44228', description: 'Apache Log4j2 JNDI features do not protect against attacker-controlled LDAP endpoints, enabling remote code execution (Log4Shell).', severity: 'critical', cvss: 10.0, published: offsetIso(-60000), modified: offsetIso(-50000), products: ['log4j'], references: ['https://logging.apache.org/'] },
    { id: 'CVE-2024-27198', description: 'An authentication bypass in TeamCity allows an attacker to gain administrative control of the server.', severity: 'critical', cvss: 9.8, published: offsetIso(-6000), modified: offsetIso(-1000), products: ['teamcity'], references: ['https://www.jetbrains.com/'] },
    { id: 'CVE-2023-22515', description: 'A broken access control vulnerability in Confluence Data Center allows attackers to create unauthorized administrator accounts.', severity: 'critical', cvss: 9.1, published: offsetIso(-18000), modified: offsetIso(-9000), products: ['confluence'], references: ['https://www.atlassian.com/'] },
    { id: 'CVE-2024-23897', description: 'Jenkins CLI allows arbitrary file read via a built-in command parser feature, potentially leading to RCE.', severity: 'medium', cvss: 6.5, published: offsetIso(-7000), modified: offsetIso(-2000), products: ['jenkins'], references: ['https://www.jenkins.io/'] },
  ];

  function filterDemoCves({ keyword, severity }) {
    let items = DEMO_CVES.slice();
    if (severity) items = items.filter(c => c.severity === severity.toLowerCase());
    if (keyword) {
      const q = keyword.toLowerCase();
      items = items.filter(c => c.id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.products.some(p => p.includes(q)));
    }
    return items;
  }

  const DEMO_COUNTRIES = Object.entries(SX?.COUNTRY_COORDS || {}).map(([code, latlng]) => ({
    code, name: code, region: '—', population: 0, flag: '', latlng
  }));

  function offsetIso(minutes) {
    return new Date(Date.now() + minutes * 60000).toISOString();
  }

  return {
    getIPInformation, getVulnerabilities, getCountryData, getThreatData, getSecurityAdvisories,
    DEMO_THREATS, DEMO_CVES,
  };
})();
