const fs = require('fs');
const path = require('path');

function normalizeApiUrl(url) {
  let u = (url || '').trim().replace(/\/$/, '');
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('localhost') || u.startsWith('127.0.0.1')) return `http://${u}`;
  return `https://${u}`;
}

function copyVendor() {
  const vendorDir = 'vendor';
  fs.mkdirSync(vendorDir, { recursive: true });

  const copies = [
    ['node_modules/jspdf/dist/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js'],
    ['node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js', 'vendor/jspdf.plugin.autotable.min.js'],
    ['node_modules/pdfjs-dist/legacy/build/pdf.min.js', 'vendor/pdf.min.js'],
    ['node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js', 'vendor/pdf.worker.min.js'],
  ];

  for (const [src, dest] of copies) {
    if (!fs.existsSync(src)) {
      console.error(`Missing dependency file: ${src}`);
      console.error('Run: npm install');
      process.exit(1);
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied ${path.basename(dest)}`);
  }
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

copyVendor();

fs.writeFileSync(
  'config.js',
  `// Auto-generated at build time — do not edit\nwindow.API_BASE_URL = '${finalUrl}';\n`
);

console.log(`Built config.js with API_URL: ${finalUrl}`);
