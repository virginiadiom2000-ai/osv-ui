#!/usr/bin/env node
import { resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { createServer } from '../src/server.js';
import { scanService } from '../src/scanner.js';

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const portArg = args.find(a => a.startsWith('--port='));
const PORT = portArg ? parseInt(portArg.split('=')[1]) : 2003;
const noOpen = args.includes('--no-open');
const discover = args.includes('--discover');
const noOsv = args.includes('--offline');           // skip live OSV.dev lookup
const paths = args.filter(a => !a.startsWith('--'));// positional = service dirs

const log = (msg) => process.stdout.write(msg + '\n');
const dim = (s) => `\x1b[90m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

log('');
log(bold(cyan('  ⚡ osv-ui')) + ' — multi-service CVE dashboard');
log(dim('  CVE data: OSV.dev (live, updated daily from NVD + GitHub Advisory)'));
log('');

// ── Discover services ────────────────────────────────────────────────────────
function discoverDirs(root) {
  const hits = [];
  const MANIFEST = ['package-lock.json', 'requirements.txt', 'Pipfile.lock', 'poetry.lock', 'pyproject.toml'];
  const IGNORE = ['node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', '.next', 'build'];
  function walk(dir, depth = 0) {
    if (depth > 3) return;
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    const hasManifest = entries.some(e => MANIFEST.includes(e));
    if (hasManifest) { hits.push(dir); return; } // don't recurse into a found service
    for (const e of entries) {
      if (IGNORE.includes(e)) continue;
      const full = join(dir, e);
      try { if (statSync(full).isDirectory()) walk(full, depth + 1); } catch {}
    }
  }
  walk(root);
  return hits;
}

let serviceDirs = [];
if (paths.length > 0) {
  serviceDirs = paths.map(p => resolve(p));
} else if (discover) {
  log(dim('  Discovering services from current directory...'));
  serviceDirs = discoverDirs(process.cwd());
  if (serviceDirs.length === 0) {
    log(red('  ✖ No service manifests found. Try passing paths explicitly.'));
    process.exit(1);
  }
  log(dim(`  Found ${serviceDirs.length} service(s)\n`));
} else {
  serviceDirs = [process.cwd()];
}

// ── Validate dirs ────────────────────────────────────────────────────────────
const MANIFESTS = ['package-lock.json', 'requirements.txt', 'Pipfile.lock', 'poetry.lock', 'pyproject.toml'];
serviceDirs = serviceDirs.filter(dir => {
  const ok = existsSync(dir) && MANIFESTS.some(m => existsSync(join(dir, m)));
  if (!ok) log(yellow(`  ⚠ Skipping ${dir} — no supported manifest found`));
  return ok;
});

if (serviceDirs.length === 0) {
  log(red('  ✖ No valid service directories found.'));
  log('');
  log('  Supported manifests:');
  log(dim('    npm:    package-lock.json'));
  log(dim('    Python: requirements.txt · Pipfile.lock · poetry.lock · pyproject.toml'));
  log('');
  log('  Usage:');
  log(cyan('    npx osv-ui                          ') + dim('# current dir'));
  log(cyan('    npx osv-ui ./frontend ./api ./worker') + dim('# multi-service'));
  log(cyan('    npx osv-ui --discover               ') + dim('# auto-detect'));
  log('');
  process.exit(1);
}

// ── Scan all services ────────────────────────────────────────────────────────
const services = [];
for (const dir of serviceDirs) {
  log(dim(`  → Scanning ${dir}`));
  try {
    const result = await scanService(dir, { noOsv });
    services.push(result);
    const v = result.vulns.length;
    const crit = result.severity.critical;
    const statusIcon = crit > 0 ? red('●') : v > 0 ? yellow('●') : green('●');
    log(`    ${statusIcon} ${bold(result.name)} ${dim(`(${result.ecosystem})`)} — ${v} vuln${v !== 1 ? 's' : ''}`);
  } catch (e) {
    log(red(`    ✖ Failed: ${e.message}`));
  }
}

log('');

// ── Global summary ───────────────────────────────────────────────────────────
const totalVulns = services.reduce((s, r) => s + r.vulns.length, 0);
const totalCrit = services.reduce((s, r) => s + r.severity.critical, 0);
const totalPkgs = services.reduce((s, r) => s + r.packages.length, 0);

// ── Start server ─────────────────────────────────────────────────────────────
createServer({ services, scannedAt: new Date().toISOString(), noOsv }, PORT).then(async () => {
  const url = `http://localhost:${PORT}`;
  log(`  ${green('✔')} Dashboard ready → ${cyan(url)}`);
  log(dim(`  ${totalPkgs} packages · ${totalVulns} vulnerabilities · ${services.length} service(s)`));
  if (totalCrit > 0) log(red(`  ⚠ ${totalCrit} CRITICAL vulnerability${totalCrit > 1 ? 'ies' : ''} found!`));
  log(dim('  Press Ctrl+C to stop\n'));

  if (!noOpen) {
    try { const { default: open } = await import('open'); await open(url); } catch {}
  }
});
