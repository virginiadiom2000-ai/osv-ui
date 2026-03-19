import express from 'express';

export function createServer(payload, port) {
  return new Promise((resolve, reject) => {
    const app = express();
    app.get('/', (_, res) => { res.setHeader('Content-Type', 'text/html'); res.send(buildDashboard(payload)); });
    app.get('/api/data', (_, res) => res.json(payload));
    const server = app.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', e => {
      if (e.code === 'EADDRINUSE') console.error(`Port ${port} in use — try --port=4322`);
      reject(e);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const SEV_COLOR = { critical: '#e53e3e', high: '#dd6b20', moderate: '#d69e2e', low: '#3182ce', unknown: '#718096' };
const SEV_BG    = { critical: '#fff5f5', high: '#fffaf0', moderate: '#fffff0', low: '#ebf8ff', unknown: '#f7fafc' };
const SEV_ORDER = { critical: 0, high: 1, moderate: 2, low: 3, unknown: 4 };

function sevBadge(s) {
  return `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em;background:${SEV_BG[s]};color:${SEV_COLOR[s]};border:1px solid ${SEV_COLOR[s]}25">${esc(s)}</span>`;
}

function riskColor(score) {
  return score >= 50 ? '#e53e3e' : score >= 20 ? '#dd6b20' : score > 0 ? '#d69e2e' : '#38a169';
}

function buildDashboard({ services, scannedAt, noOsv }) {
  const totalVulns = services.reduce((s, r) => s + r.vulns.length, 0);
  const totalPkgs  = services.reduce((s, r) => s + r.totalPackages, 0);
  const totalCrit  = services.reduce((s, r) => s + r.severity.critical, 0);
  const totalHigh  = services.reduce((s, r) => s + r.severity.high, 0);
  const globalRisk = services.reduce((s, r) => s + r.riskScore, 0);
  const avgRisk    = services.length ? Math.round(globalRisk / services.length) : 0;

  // Build service nav
  const serviceNav = services.map((svc, i) => {
    const dot = svc.severity.critical > 0 ? '#e53e3e' : svc.vulns.length > 0 ? '#dd6b20' : '#38a169';
    const ecoIcons = svc.ecosystems.map(e => e === 'npm' ? '🟨' : e === 'PyPI' ? '🐍' : '📦').join('');
    return `<div class="nav-item ${i === 0 ? 'active' : ''}" onclick="showService(${i}, this)" data-svc="${i}">
      <span style="width:7px;height:7px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0"></span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(svc.name)}</span>
      <span style="font-size:10px;color:#a0aec0;flex-shrink:0">${ecoIcons} ${svc.vulns.length}</span>
    </div>`;
  }).join('');

  // Build per-service panels
  const servicePanels = services.map((svc, i) => buildServicePanel(svc, i)).join('');

  const osvNote = noOsv
    ? `<div style="background:#fffaf0;border:1px solid #f6e05e;border-radius:6px;padding:8px 12px;font-size:12px;color:#744210;margin-bottom:16px">
        ⚠ Running in offline mode — CVE data not fetched. Remove <code>--offline</code> to query OSV.dev.
      </div>`
    : `<div style="background:#f0fff4;border:1px solid #9ae6b4;border-radius:6px;padding:8px 12px;font-size:12px;color:#276749;margin-bottom:16px">
        ✅ CVE data from <a href="https://osv.dev" target="_blank" rel="noopener" style="color:#276749;font-weight:600">OSV.dev</a> — updated daily from NVD · GitHub Advisory · PyPI Advisory · npm Advisory
      </div>`;

  const scanTime = new Date(scannedAt).toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>osv-ui — ${services.length} service${services.length > 1 ? 's' : ''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--red:#e53e3e;--orange:#dd6b20;--yellow:#d69e2e;--blue:#3182ce;--green:#38a169;--gray:#718096;--bg:#f7fafc;--card:#fff;--border:#e2e8f0;--text:#1a202c;--muted:#718096;--sidebar:220px}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:13px}
a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}
code{font-family:'SF Mono',Menlo,Monaco,monospace;font-size:11px;background:#edf2f7;padding:2px 6px;border-radius:4px;color:#c53030}

/* Layout */
.topbar{background:#1a202c;color:#e2e8f0;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:16px}
.topbar h1{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;white-space:nowrap}
.topbar .meta{font-size:11px;color:#718096;white-space:nowrap}
.body{display:flex;flex:1;min-height:0}
.sidebar{width:var(--sidebar);background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
.sidebar-top{padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0}
.sidebar-top .label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.global-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.gs{background:var(--bg);border-radius:6px;padding:7px;text-align:center}
.gs .v{font-size:18px;font-weight:700;line-height:1}
.gs .l{font-size:9px;color:var(--muted);margin-top:1px}
.sidebar-nav{flex:1;overflow-y:auto;padding:8px 0}
.sidebar-section{font-size:9px;font-weight:700;letter-spacing:.1em;color:#a0aec0;padding:10px 14px 4px;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:7px;padding:7px 14px;cursor:pointer;border-left:2px solid transparent;transition:all .12s}
.nav-item:hover{background:#f7fafc;color:var(--text)}
.nav-item.active{background:#ebf8ff;border-left-color:#3182ce;color:#2b6cb0;font-weight:500}
.content{flex:1;overflow-y:auto;padding:20px}

/* Service panel */
.svc-panel{display:none}.svc-panel.active{display:block}
.svc-header{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.svc-title{font-size:18px;font-weight:700}
.eco-badge{font-size:10px;font-weight:600;padding:3px 9px;border-radius:999px;border:1px solid}

/* Stats grid */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-bottom:16px}
.sc{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center}
.sc .v{font-size:24px;font-weight:700;line-height:1}
.sc .l{font-size:10px;color:var(--muted);margin-top:3px}

/* Risk bar */
.risk-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px}
.risk-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:12px}
.risk-track{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden}
.risk-fill{height:100%;border-radius:4px;transition:width .8s ease}

/* Tabs */
.tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:16px}
.tab{padding:8px 16px;cursor:pointer;font-size:12px;font-weight:500;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .12s}
.tab:hover{color:var(--text)}
.tab.active{color:#2b6cb0;border-bottom-color:#3182ce}
.tab-content{display:none}.tab-content.active{display:block}

/* Filters */
.filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.fb{padding:4px 12px;border:1px solid var(--border);border-radius:999px;font-size:11px;cursor:pointer;background:var(--card);color:var(--muted);transition:all .12s}
.fb:hover{border-color:#a0aec0;color:var(--text)}
.fb.active{background:#3182ce;border-color:#3182ce;color:#fff}
.search{padding:7px 12px;border:1px solid var(--border);border-radius:7px;font-size:12px;width:100%;max-width:280px;outline:none;margin-bottom:10px}
.search:focus{border-color:#3182ce;box-shadow:0 0 0 2px #3182ce18}

/* Table */
.tbl-wrap{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
thead{background:#f7fafc}
th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:9px 12px;border-bottom:1px solid #f0f4f8;vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafbfc}

/* Fix card */
.fix-card{background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:12px;margin-top:6px;display:none}
.fix-card.show{display:block}
.fix-cmd{font-family:'SF Mono',monospace;font-size:12px;background:#e6fffa;padding:6px 10px;border-radius:5px;color:#276749;display:flex;align-items:center;justify-content:space-between;gap:8px}
.fix-cmd button{font-size:10px;padding:2px 8px;border:1px solid #9ae6b4;border-radius:4px;background:#fff;cursor:pointer;color:#276749;white-space:nowrap}
.fix-cmd button:hover{background:#9ae6b4}

/* Dependabot-style upgrade table */
.upgrade-card{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px}
.uc-header{background:#f0fff4;border-bottom:1px solid #9ae6b4;padding:10px 14px;font-size:12px;font-weight:600;color:#276749;display:flex;align-items:center;gap:8px}

/* Charts row */
.charts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.cc{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px}
.ct{font-size:12px;font-weight:600;margin-bottom:12px}
.donut-wrap{display:flex;align-items:center;gap:12px}
.donut-legend{display:flex;flex-direction:column;gap:5px;font-size:11px}
.leg-item{display:flex;align-items:center;gap:5px}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.pkg-tag{font-size:10px;padding:1px 6px;border-radius:999px}

/* Empty state */
.empty{text-align:center;padding:32px;color:var(--green)}
.empty .icon{font-size:40px;margin-bottom:8px}

/* Vuln detail expandable row */
.detail-row{background:#fafbfc;display:none}
.detail-row.show{display:table-row}
.detail-content{padding:10px 14px;font-size:11px;color:var(--muted)}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.detail-item .label{font-size:10px;color:#a0aec0;margin-bottom:2px;text-transform:uppercase;letter-spacing:.05em}
.detail-item .val{font-size:12px;color:var(--text)}
tr.clickable{cursor:pointer}
tr.clickable:hover td{background:#f0f4f8}
.kofi-button{margin-top:8px;transition:all .2s ease;opacity:.7;display:inline-block;vertical-align:middle}.kofi-button:hover{opacity:1;transform:scale(1.02)}.kofi-button img{height:20px!important;border-radius:4px;display:block}
</style>
</head>
<body>

<div class="topbar">
  <h1>🔍 osv-ui
    <span style="font-size:10px;background:#4a5568;padding:2px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;color:#fff;font-weight:400">v1.0.6</span>
    <span style="color:#4a5568;font-weight:400">/</span>
    <span style="color:#a0aec0;font-weight:400">${services.length} service${services.length > 1 ? 's' : ''}</span>
  </h1>
  <span class="meta">Scanned ${scanTime} · ${totalPkgs.toLocaleString()} packages · <a href="/api/data" target="_blank" style="color:#4a5568">JSON API</a></span>
</div>

<div class="body">
  <nav class="sidebar">
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);font-size:10px;color:var(--muted);line-height:1.5;background:#f7fafc;flex-shrink:0">
      <div style="font-weight:600;color:var(--text);margin-bottom:2px">Developer Info</div>
      <div>👤 Toan Nguyen</div>
      <div>✉️ <a href="mailto:mitodng@gmail.com" style="color:var(--muted)">mitodng@gmail.com</a></div>
      <div>💻 <a href="https://github.com/toan203/osv-ui" target="_blank" rel="noopener" style="color:var(--muted)">toan203/osv-ui</a></div>
      <div class="kofi-button">
        <a href='https://ko-fi.com/P5P31W9W6A' target='_blank'><img src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
      </div>
    </div>
    <div class="sidebar-top">
      <div class="label">Global summary</div>
      <div class="global-stats">
        <div class="gs"><div class="v">${totalPkgs.toLocaleString()}</div><div class="l">Packages</div></div>
        <div class="gs"><div class="v">${totalVulns}</div><div class="l">Total CVEs</div></div>
        <div class="gs"><div class="v" style="color:var(--red)">${totalCrit}</div><div class="l">Critical</div></div>
        <div class="gs"><div class="v" style="color:var(--orange)">${totalHigh}</div><div class="l">High</div></div>
      </div>
    </div>
    <div class="sidebar-nav">
      <div class="sidebar-section">Services</div>
      ${serviceNav}
    </div>
  </nav>

  <div class="content">
    ${osvNote}
    ${servicePanels}
  </div>
</div>

<script>
const ALL_DATA = ${JSON.stringify({ services })};

function showService(idx, el) {
  document.querySelectorAll('.svc-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('svc-' + idx).classList.add('active');
  el.classList.add('active');
}

function showTab(svcIdx, tabName) {
  const panel = document.getElementById('svc-' + svcIdx);
  panel.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  panel.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
}

// Risk bar animations on load
window.addEventListener('load', () => {
  document.querySelectorAll('.risk-fill[data-score]').forEach(el => {
    setTimeout(() => el.style.width = el.dataset.score + '%', 150);
  });
});

// Vuln filter
function filterVulns(svcIdx, sev, btn) {
  const panel = document.getElementById('svc-' + svcIdx);
  panel.querySelectorAll('.sev-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyVulnFilters(svcIdx);
}
function searchVulns(svcIdx, q) { applyVulnFilters(svcIdx); }
function applyVulnFilters(svcIdx) {
  const panel = document.getElementById('svc-' + svcIdx);
  const activeBtn = panel.querySelector('.sev-filter.active');
  const curSev = activeBtn?.dataset.sev || 'all';
  const search = panel.querySelector('.vuln-search')?.value?.toLowerCase() || '';
  panel.querySelectorAll('.vuln-row').forEach(row => {
    const sevMatch = curSev === 'all' || row.dataset.severity === curSev;
    const searchMatch = !search || row.dataset.pkg?.includes(search);
    row.style.display = sevMatch && searchMatch ? '' : 'none';
    // also hide the detail row below it
    const next = row.nextElementSibling;
    if (next?.classList.contains('detail-row')) next.style.display = 'none';
  });
}

// Package filter
function filterPkgs(svcIdx, type, btn) {
  const panel = document.getElementById('svc-' + svcIdx);
  panel.querySelectorAll('.pkg-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const search = panel.querySelector('.pkg-search')?.value?.toLowerCase() || '';
  panel.querySelectorAll('.pkg-row').forEach(row => {
    const typeMatch = type === 'all' || row.dataset.type === type;
    const searchMatch = !search || row.dataset.name?.includes(search);
    row.style.display = typeMatch && searchMatch ? '' : 'none';
  });
}
function searchPkgs(svcIdx, q) {
  const panel = document.getElementById('svc-' + svcIdx);
  const activeBtn = panel.querySelector('.pkg-filter.active');
  const type = activeBtn?.dataset.type || 'all';
  filterPkgs(svcIdx, type, activeBtn || panel.querySelector('.pkg-filter'));
}

// Toggle vuln detail row
function toggleDetail(rowId) {
  const row = document.getElementById('detail-' + rowId);
  if (!row) return;
  const isOpen = row.classList.contains('show');
  // close all in same table
  row.closest('table').querySelectorAll('.detail-row.show').forEach(r => {
    r.classList.remove('show');
    r.style.display = 'none';
  });
  if (!isOpen) {
    row.classList.add('show');
    row.style.display = 'table-row';
  } else {
    row.style.display = 'none';
  }
}

// Copy fix command
function copyCmd(btn, cmd) {
  navigator.clipboard?.writeText(cmd).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 1500);
  });
}

// Donut charts
function drawDonut(canvasId, segments, cx=60, cy=60, r=44, hole=26) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  const total = segments.reduce((s, x) => s + x.v, 0);
  if (!total) { el.innerHTML = '<text x="' + cx + '" y="' + (cy+4) + '" text-anchor="middle" font-size="10" fill="#a0aec0">no data</text>'; return; }
  let angle = -90, paths = '';
  segments.forEach(seg => {
    if (!seg.v) return;
    const a1 = angle * Math.PI / 180;
    const deg = (seg.v / total) * 360; angle += deg;
    const a2 = angle * Math.PI / 180, lg = deg > 180 ? 1 : 0;
    const x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    const x2=cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2);
    const ix1=cx+hole*Math.cos(a1), iy1=cy+hole*Math.sin(a1);
    const ix2=cx+hole*Math.cos(a2), iy2=cy+hole*Math.sin(a2);
    paths += '<path d="M'+ix1+','+iy1+'L'+x1+','+y1+'A'+r+','+r+' 0 '+lg+' 1 '+x2+','+y2+'L'+ix2+','+iy2+'A'+hole+','+hole+' 0 '+lg+' 0 '+ix1+','+iy1+'" fill="'+seg.c+'" opacity=".9"/>';
  });
  el.innerHTML = paths +
    '<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" font-size="15" font-weight="700" fill="#1a202c">'+total+'</text>' +
    '<text x="'+cx+'" y="'+(cy+11)+'" text-anchor="middle" font-size="9" fill="#718096">total</text>';
}

window.addEventListener('load', () => {
  ALL_DATA.services.forEach((svc, i) => {
    const s = svc.severity;
    drawDonut('donut-sev-'+i, [
      {v:s.critical, c:'#e53e3e', l:'Critical'},
      {v:s.high,     c:'#dd6b20', l:'High'},
      {v:s.moderate, c:'#d69e2e', l:'Moderate'},
      {v:s.low,      c:'#3182ce', l:'Low'},
    ]);
    const fix = svc.vulns.filter(v => v.fixedIn).length;
    const nofix = svc.vulns.length - fix;
    drawDonut('donut-fix-'+i, [
      {v:fix,   c:'#38a169', l:'Has fix'},
      {v:nofix, c:'#fc8181', l:'No fix yet'},
    ]);
  });
});
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
function buildServicePanel(svc, i) {
  const sev = svc.severity;
  const rc = riskColor(svc.riskScore);

  // Ecosystem badges
  const ecoBadges = svc.ecosystems.map(e => {
    const [bg, fg, border] = e === 'npm'
      ? ['#fffef0','#7d6608','#f6e05e']
      : ['#f0f9ff','#1e4e79','#bee3f8'];
    return `<span class="eco-badge" style="background:${bg};color:${fg};border-color:${border}">${e === 'npm' ? '🟨 npm' : '🐍 Python'}</span>`;
  }).join('');

  const manifestInfo = svc.manifests.map(m => `<code>${m.source}</code>`).join(' + ');

  // Vulnerabilities tab
  const vulnRows = svc.vulns.map((v, vi) => {
    const rowId = `${i}-${vi}`;
    const fixSection = v.fixedIn
      ? `<div class="fix-cmd">
          <span>💊 Safe version: <strong>${esc(v.fixedIn)}</strong></span>
          ${v.fixCommand ? `<button onclick="copyCmd(this,'${esc(v.fixCommand)}')">Copy fix</button>` : ''}
        </div>` : '';

    const refs = v.references?.slice(0, 3).map(r => `<a href="${esc(r)}" target="_blank" rel="noopener" style="font-size:10px">${new URL(r).hostname}</a>`).join(' · ') || '';

    return `
    <tr class="vuln-row clickable" data-severity="${esc(v.severity)}" data-pkg="${esc(v.packageName.toLowerCase())}" onclick="toggleDetail('${rowId}')">
      <td>${sevBadge(v.severity)}</td>
      <td>
        <div style="font-weight:600">${esc(v.packageName)}</div>
        <div style="font-size:10px;color:#718096">v${esc(v.packageVersion)} · ${esc(v.ecosystem)}</div>
      </td>
      <td>
        <div style="max-width:240px">${esc(v.title)}</div>
        <div style="font-size:10px;color:#718096;margin-top:2px">${esc(v.cveId || v.id || '')}</div>
      </td>
      <td><code>${esc(v.affectedRange)}</code></td>
      <td>${v.isDirect ? '<span class="pkg-tag" style="background:#e6fffa;color:#276749">direct</span>' : '<span class="pkg-tag" style="background:#edf2f7;color:#718096">transitive</span>'}</td>
      <td>${v.fixedIn ? `<span style="color:#38a169;font-weight:600">✅ ${esc(v.fixedIn)}</span>` : '<span style="color:#718096">—</span>'}</td>
    </tr>
    <tr class="detail-row" id="detail-${rowId}">
      <td colspan="6">
        <div class="detail-content">
          ${v.details ? `<div style="margin-bottom:8px;line-height:1.5">${esc(v.details.slice(0, 400))}${v.details.length > 400 ? '…' : ''}</div>` : ''}
          ${fixSection}
          <div class="detail-grid" style="margin-top:8px">
            ${v.cvssScore ? `<div class="detail-item"><div class="label">CVSS Score</div><div class="val"><strong>${v.cvssScore.toFixed(1)}</strong> / 10</div></div>` : ''}
            <div class="detail-item"><div class="label">OSV ID</div><div class="val"><a href="${esc(v.osvUrl)}" target="_blank">${esc(v.id)}</a></div></div>
            ${v.nvdUrl ? `<div class="detail-item"><div class="label">NVD</div><div class="val"><a href="${esc(v.nvdUrl)}" target="_blank">${esc(v.cveId)}</a></div></div>` : ''}
            ${v.ghsaUrl ? `<div class="detail-item"><div class="label">GitHub Advisory</div><div class="val"><a href="${esc(v.ghsaUrl)}" target="_blank">${esc(v.ghsaId)}</a></div></div>` : ''}
            ${v.published ? `<div class="detail-item"><div class="label">Published</div><div class="val">${new Date(v.published).toLocaleDateString()}</div></div>` : ''}
          </div>
          ${refs ? `<div style="margin-top:8px;font-size:10px;color:#718096">References: ${refs}</div>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  // Dependabot-style fix recommendations
  const fixable = svc.vulns.filter(v => v.fixedIn && v.isDirect);
  const fixRows = fixable.map(v => `
    <tr>
      <td>${sevBadge(v.severity)}</td>
      <td><strong>${esc(v.packageName)}</strong></td>
      <td style="color:#c53030"><code>${esc(v.packageVersion)}</code></td>
      <td style="color:#38a169"><code>${esc(v.fixedIn)}</code></td>
      <td><div class="fix-cmd" style="margin:0">${esc(v.fixCommand || '')}<button onclick="copyCmd(this,'${esc(v.fixCommand || '')}')">Copy</button></div></td>
    </tr>`).join('');

  // Packages tab
  const pkgRows = svc.packages.slice(0, 800).map((p, pi) => `
    <tr class="pkg-row" data-type="${p.dev ? 'dev' : 'prod'}" data-name="${esc(p.name.toLowerCase())}">
      <td><a href="${esc(p.registry)}" target="_blank" rel="noopener">${esc(p.name)}</a></td>
      <td><code>${esc(p.version)}</code></td>
      <td><span class="pkg-tag" style="${p.dev ? 'background:#ebf8ff;color:#2b6cb0' : 'background:#f0fff4;color:#276749'}">${p.dev ? 'dev' : 'prod'}</span></td>
      <td>${esc(p.ecosystem)}</td>
      ${p.isDirect !== undefined ? `<td>${p.isDirect ? '✓' : ''}</td>` : ''}
    </tr>`).join('');

  // Severity filter buttons
  const sevFilterButtons = ['critical','high','moderate','low']
    .filter(s => sev[s] > 0)
    .map(s => `<button class="fb sev-filter" data-sev="${s}" onclick="filterVulns(${i},'${s}',this)" style="color:${SEV_COLOR[s]}">● ${capitalize(s)} (${sev[s]})</button>`)
    .join('');

  return `
<div class="svc-panel ${i === 0 ? 'active' : ''}" id="svc-${i}">
  <div class="svc-header">
    <span class="svc-title">${esc(svc.name)}</span>
    ${ecoBadges}
    <span style="font-size:11px;color:#a0aec0">${manifestInfo}</span>
  </div>

  <div class="stats-grid">
    <div class="sc"><div class="v">${svc.totalPackages.toLocaleString()}</div><div class="l">Packages</div></div>
    <div class="sc"><div class="v" style="color:#38a169">${svc.directCount}</div><div class="l">Direct</div></div>
    <div class="sc"><div class="v" style="color:var(--red)">${sev.critical}</div><div class="l">Critical</div></div>
    <div class="sc"><div class="v" style="color:var(--orange)">${sev.high}</div><div class="l">High</div></div>
    <div class="sc"><div class="v" style="color:var(--yellow)">${sev.moderate}</div><div class="l">Moderate</div></div>
    <div class="sc"><div class="v" style="color:var(--blue)">${sev.low}</div><div class="l">Low</div></div>
  </div>

  <div class="risk-card">
    <div class="risk-row">
      <span style="font-weight:600">Risk score</span>
      <span style="font-size:15px;font-weight:700;color:${rc}">${svc.riskScore}/100</span>
    </div>
    <div class="risk-track">
      <div class="risk-fill" data-score="${svc.riskScore}" style="width:0;background:${rc}"></div>
    </div>
  </div>

  <div class="charts">
    <div class="cc">
      <div class="ct">Severity breakdown</div>
      <div class="donut-wrap">
        <svg width="120" height="120" viewBox="0 0 120 120" id="donut-sev-${i}"></svg>
        <div class="donut-legend">
          ${['critical','high','moderate','low'].filter(s => sev[s]).map(s =>
            `<div class="leg-item"><div class="dot" style="background:${SEV_COLOR[s]}"></div>${capitalize(s)}: ${sev[s]}</div>`
          ).join('')}
        </div>
      </div>
    </div>
    <div class="cc">
      <div class="ct">Fix availability</div>
      <div class="donut-wrap">
        <svg width="120" height="120" viewBox="0 0 120 120" id="donut-fix-${i}"></svg>
        <div class="donut-legend">
          <div class="leg-item"><div class="dot" style="background:#38a169"></div>Has fix: ${svc.vulns.filter(v=>v.fixedIn).length}</div>
          <div class="leg-item"><div class="dot" style="background:#fc8181"></div>No fix: ${svc.vulns.filter(v=>!v.fixedIn).length}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="tabs">
    <div class="tab active" data-tab="vulns" onclick="showTab(${i},'vulns')">🚨 Vulnerabilities (${svc.vulns.length})</div>
    <div class="tab" data-tab="fixes" onclick="showTab(${i},'fixes')">💊 Upgrade guide (${fixable.length} direct)</div>
    <div class="tab" data-tab="packages" onclick="showTab(${i},'packages')">📦 Packages (${svc.totalPackages})</div>
  </div>

  <!-- VULNERABILITIES TAB -->
  <div class="tab-content active" data-tab="vulns">
    ${svc.vulns.length === 0
      ? `<div class="tbl-wrap"><div class="empty"><div class="icon">✅</div><div style="font-size:16px;font-weight:600">No vulnerabilities found</div><div style="color:#718096;margin-top:4px">${svc.totalPackages} packages all clean</div></div></div>`
      : `<div class="filters">
          <button class="fb sev-filter active" data-sev="all" onclick="filterVulns(${i},'all',this)">All (${svc.vulns.length})</button>
          ${sevFilterButtons}
        </div>
        <input class="search vuln-search" placeholder="Search package..." oninput="applyVulnFilters(${i})">
        <div style="font-size:11px;color:#a0aec0;margin-bottom:8px">↓ Click any row to expand details · Data from OSV.dev</div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Severity</th><th>Package</th><th>Description</th><th>Affected</th><th>Type</th><th>Fix in</th></tr></thead>
            <tbody>${vulnRows}</tbody>
          </table>
        </div>`
    }
  </div>

  <!-- FIX GUIDE TAB (Dependabot-style) -->
  <div class="tab-content" data-tab="fixes">
    ${fixable.length === 0
      ? `<div class="tbl-wrap"><div class="empty"><div class="icon">${svc.vulns.length === 0 ? '✅' : '⚠'}</div><div style="font-size:14px;font-weight:600">${svc.vulns.length === 0 ? 'No vulnerabilities!' : 'No auto-fixable vulnerabilities found'}</div><div style="color:#718096;font-size:12px;margin-top:4px">${svc.vulns.length > 0 ? 'Transitive deps may need upstream fixes.' : ''}</div></div></div>`
      : `<div class="upgrade-card">
          <div class="uc-header">💊 ${fixable.length} direct ${fixable.length === 1 ? 'package' : 'packages'} can be upgraded to fix CVEs</div>
          <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Severity</th><th>Package</th><th>Current</th><th>Safe version</th><th>Command</th></tr></thead>
            <tbody>${fixRows}</tbody>
          </table>
          </div>
        </div>
        ${svc.vulns.filter(v=>v.fixedIn&&!v.isDirect).length > 0
          ? `<div class="tbl-wrap" style="background:#fffaf0;border-color:#f6e05e">
              <div style="padding:10px 14px;font-size:12px;color:#744210;font-weight:600">⚠ Transitive dependency fixes</div>
              <div style="padding:0 14px 12px;font-size:12px;color:#744210">
                ${svc.ecosystem === 'npm' ? 'Run <code>npm audit fix</code> or <code>npm audit fix --force</code> to attempt automatic resolution of transitive vulnerabilities.' :
                  'For Python transitive deps: check if top-level packages have newer versions that pull in safe sub-versions.'}
              </div>
            </div>` : ''}
        <div style="font-size:11px;color:#a0aec0;margin-top:8px">Fix commands are generated based on OSV.dev "fixed in" data. Always test in staging first.</div>`
    }
  </div>

  <!-- PACKAGES TAB -->
  <div class="tab-content" data-tab="packages">
    <div class="filters">
      <button class="fb pkg-filter active" data-type="all" onclick="filterPkgs(${i},'all',this)">All (${svc.totalPackages})</button>
      <button class="fb pkg-filter" data-type="prod" onclick="filterPkgs(${i},'prod',this)">Production</button>
      <button class="fb pkg-filter" data-type="dev" onclick="filterPkgs(${i},'dev',this)">Dev only</button>
    </div>
    <input class="search pkg-search" placeholder="Search..." oninput="searchPkgs(${i},this.value)">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Package</th><th>Version</th><th>Env</th><th>Ecosystem</th><th>Direct</th></tr></thead>
        <tbody>${pkgRows}</tbody>
      </table>
      ${svc.packages.length > 800 ? `<div style="padding:8px 14px;font-size:11px;color:#a0aec0">Showing first 800 of ${svc.packages.length}</div>` : ''}
    </div>
  </div>

</div>`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
