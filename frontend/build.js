const fs = require('fs');

function normalizeApiUrl(url) {
  let u = (url || '').trim().replace(/\/$/, '');
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('localhost') || u.startsWith('127.0.0.1')) return `http://${u}`;
  return `https://${u}`;
}

const isVercel = process.env.VERCEL === '1';
const rawApiUrl = process.env.API_URL || '';
const apiUrl = normalizeApiUrl(rawApiUrl);

if (isVercel) {
  if (!rawApiUrl || apiUrl.includes('localhost')) {
    console.error('\n❌ Vercel build failed: API_URL is not set.\n');
    console.error('   Go to Vercel → Settings → Environment Variables');
    console.error('   Add: API_URL = https://wms-test-production.up.railway.app\n');
    process.exit(1);
  }
}

const finalUrl = apiUrl || 'http://localhost:3006';

fs.writeFileSync(
  'config.js',
  `// Auto-generated at build time — do not edit\nwindow.API_BASE_URL = '${finalUrl}';\n`
);

console.log(`Built config.js with API_URL: ${finalUrl}`);
