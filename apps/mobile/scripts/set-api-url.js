#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Writes this machine's LAN IPv4 address into app.json as `expo.extra.apiUrl`
 * so a freshly built APK points at the current network by default.
 *
 * Usage:
 *   node scripts/set-api-url.js            # auto-detect
 *   node scripts/set-api-url.js 10.0.0.5   # force a host
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.API_PORT || 3001;
const APP_JSON = path.join(__dirname, '..', 'app.json');

/** Virtual adapters (VPN, WSL, Docker) are not reachable from a phone. */
const SKIP_INTERFACE = /(vEthernet|WSL|Hyper-V|VirtualBox|VMware|Loopback|NordLynx|TAP|Tailscale)/i;

function detectLanIp() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (SKIP_INTERFACE.test(name)) continue;
    for (const addr of addrs || []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      // Prefer typical home/office private ranges.
      const score = /^192\.168\./.test(addr.address) ? 0 : /^10\./.test(addr.address) ? 1 : 2;
      candidates.push({ address: addr.address, name, score });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0];
}

const forced = process.argv[2];
const found = forced ? { address: forced, name: 'manual' } : detectLanIp();

if (!found) {
  console.error('Could not detect a LAN IPv4 address. Pass one explicitly:');
  console.error('  node scripts/set-api-url.js 192.168.1.20');
  process.exit(1);
}

const apiUrl = `http://${found.address}:${PORT}`;
const config = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
config.expo.extra = { ...(config.expo.extra || {}), apiUrl };
fs.writeFileSync(APP_JSON, `${JSON.stringify(config, null, 2)}\n`);

console.log(`apiUrl -> ${apiUrl}  (interface: ${found.name})`);
