const fs = require('fs');

function normalizeApiUrl(url) {
  let u = (url || 'http://localhost:3006').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('localhost') || u.startsWith('127.0.0.1')) return `http://${u}`;
  return `https://${u}`;
}

const apiUrl = normalizeApiUrl(process.env.API_URL);

fs.writeFileSync(
  'config.js',
  `// Auto-generated at build time — do not edit\nwindow.API_BASE_URL = '${apiUrl}';\n`
);

console.log(`Built config.js with API_URL: ${apiUrl}`);
