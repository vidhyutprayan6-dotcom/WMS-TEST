const fs = require('fs');

const apiUrl = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');

fs.writeFileSync(
  'config.js',
  `// Auto-generated at build time — do not edit\nwindow.API_BASE_URL = '${apiUrl}';\n`
);

console.log(`Built config.js with API_URL: ${apiUrl}`);
