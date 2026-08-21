# SENTINEL-X — Global Cybersecurity Intelligence Platform

A premium, enterprise-grade Security Operations Center (SOC) web application built with **HTML5, CSS3, and vanilla JavaScript (ES6+)** — no frameworks, no build step.

## Running it

This is a static site. From the project folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. Opening the HTML files directly (`file://`) will also mostly work, but a local server avoids any browser fetch restrictions.

## Structure

```
sentinel-x/
├── index.html              Dashboard (SOC overview, threat map, KPIs, live feed)
├── threats.html            Threat Intelligence — search & filter threat events
├── incidents.html          Incident Management — status workflow, localStorage persistence
├── network.html            Network Intelligence — traffic & protocol analytics
├── vulnerabilities.html    Vulnerability / CVE Center — live NVD lookups
├── ip-intelligence.html    IP investigation tool — live geolocation & security signals
├── reports.html            Print-ready security report generator
├── settings.html           Appearance, notifications, data, and security preferences
├── css/
│   ├── style.css           Design tokens, layout shell, base components
│   ├── dashboard.css       Dashboard-specific layout (map, KPIs, activity feed)
│   ├── components.css      Shared page components (filters, tables, IP cards, settings)
│   └── responsive.css      Tablet & mobile breakpoints
├── js/
│   ├── api.js               Centralized API layer — every external fetch() lives here
│   ├── app.js                App shell: sidebar, topbar, clock, command palette, notifications
│   ├── utils.js              Formatting, validation, storage, toast, and state helpers
│   ├── dashboard.js / threats.js / incidents.js / network.js /
│   │   vulnerabilities.js / ip-intelligence.js / reports.js / settings.js
│   │                         One controller module per page
└── README.md
```

## Live data sources

All of the following are public, keyless, browser-callable (CORS-enabled) APIs:

| Data | Provider | Used in |
|---|---|---|
| IP geolocation & security signals | [ipwho.is](https://ipwho.is) | IP Intelligence page |
| CVE / vulnerability records | [NVD (NIST) 2.0 API](https://nvd.nist.gov/developers/vulnerabilities) | Vulnerability Center |
| Security advisories | [GitHub Advisory Database](https://docs.github.com/en/rest/security-advisories) | `SXApi.getSecurityAdvisories()` |
| Country reference data | [REST Countries](https://restcountries.com) | `SXApi.getCountryData()` |

If any of these calls fail (offline, rate-limited, or blocked by network policy), `js/api.js` transparently falls back to a **clearly labeled demo dataset** (`meta.source: "demo"`) so no panel ever renders blank. The UI always shows a `LIVE` or `DEMO` badge so it's obvious which mode is active.

**Raw threat-event telemetry** (the world map, activity feed, network traffic charts) has no broadly available keyless public API, so it's served from a structured, clearly-labeled demonstration dataset in `js/api.js`. Swap `getThreatData()` for a real feed (via a backend proxy, since most commercial threat-intel APIs require a secret key) in production.

## Notes

- No API keys are stored or exposed in the source. Endpoints requiring a secret are not called from the browser.
- Incident status changes and all Settings preferences persist via `localStorage`.
- Built for keyboard access: `Ctrl/Cmd + K` opens the command palette; all interactive elements are focusable with visible focus states.
- Respects `prefers-reduced-motion`.
