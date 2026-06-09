const $ = (id) => document.getElementById(id);

const LOCAL_API_URL = 'http://localhost:3006';
const CONFIG_VERSION = '4'; // bump to reset stale localStorage (valid demo UUIDs)

const fields = ['baseUrl', 'clientId', 'userId', 'invoiceMonth', 'productId', 'fromBinId', 'toBinId', 'batchNumber', 'expiryDate', 'quantity', 'invoiceId'];

/** Ensures API URL is absolute. Migrates old port 3000 to 3006. */
function normalizeBaseUrl(url) {
  let u = (url || '').trim().replace(/\/$/, '');
  if (!u) return LOCAL_API_URL;

  // Auto-migrate old local port
  u = u.replace('http://localhost:3000', LOCAL_API_URL);
  u = u.replace('http://127.0.0.1:3000', LOCAL_API_URL);

  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('localhost') || u.startsWith('127.0.0.1')) {
    return `http://${u}`;
  }
  return `https://${u}`;
}

function getDefaultBaseUrl() {
  return normalizeBaseUrl(window.API_BASE_URL || LOCAL_API_URL);
}

function getBaseUrl() {
  return normalizeBaseUrl($('baseUrl').value);
}

function migrateStorage() {
  const savedVersion = localStorage.getItem('wms_configVersion');
  if (savedVersion === CONFIG_VERSION) return;

  const savedBase = localStorage.getItem('wms_baseUrl');
  if (!savedBase || savedBase.includes('localhost:3000') || savedBase.includes('127.0.0.1:3000')) {
    localStorage.setItem('wms_baseUrl', LOCAL_API_URL);
  }

  // Clear stale placeholder tenant IDs from older seed fallbacks
  const savedClient = localStorage.getItem('wms_clientId') || '';
  if (savedClient.includes('00000000-0000-0000-0000-0000000000')) {
    localStorage.removeItem('wms_clientId');
    localStorage.removeItem('wms_userId');
  }

  localStorage.setItem('wms_configVersion', CONFIG_VERSION);
}

function loadConfig() {
  migrateStorage();

  const savedBase = localStorage.getItem('wms_baseUrl');
  $('baseUrl').value = normalizeBaseUrl(savedBase || getDefaultBaseUrl());

  fields.filter((k) => k !== 'baseUrl').forEach((key) => {
    const saved = localStorage.getItem(`wms_${key}`);
    if (saved && $(key)) $(key).value = saved;
  });
}

function saveConfig() {
  const normalized = getBaseUrl();
  $('baseUrl').value = normalized;
  localStorage.setItem('wms_configVersion', CONFIG_VERSION);
  fields.forEach((key) => {
    if ($(key)) localStorage.setItem(`wms_${key}`, $(key).value);
  });
  showHint('seedStatus', 'Config saved. API URL: ' + normalized);
}

function showResponse(status, data) {
  const badge = $('statusBadge');
  badge.textContent = status;
  badge.className = 'badge ' + (status >= 200 && status < 300 ? 'ok' : 'err');
  $('responseOutput').textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

function showHint(id, msg) {
  $(id).textContent = msg;
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.startsWith('<!') || text.startsWith('The page')) {
      throw new Error(
        `Server returned HTML instead of JSON (status ${res.status}). ` +
        'Check API Base URL — use https:// for Railway or http://localhost:3006 for local.'
      );
    }
    return text;
  }
}

async function api(method, path, body, skipHeaders = false) {
  const baseUrl = getBaseUrl();
  $('baseUrl').value = baseUrl;

  const headers = { 'Content-Type': 'application/json' };
  if (!skipHeaders) {
    headers['x-client-id'] = $('clientId').value.trim();
    headers['x-user-id'] = $('userId').value.trim();
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${baseUrl}${path}`, opts);
    const data = await parseResponse(res);
    showResponse(res.status, data);
    return { status: res.status, data };
  } catch (err) {
    const message = err.message?.includes('fetch')
      ? `Cannot reach backend at ${baseUrl}. Start backend: cd backend && npm run dev`
      : err.message;
    showResponse(0, { success: false, error: message });
    showHint('seedStatus', message);
    return { status: 0, data: { error: message } };
  }
}

let seedInfo = null;

async function loadSeedInfo() {
  const result = await api('GET', '/api/config/seed-info', null, true);
  if (result.status !== 200 || !result.data?.data) return null;

  seedInfo = result.data.data;
  const offline = ['static-fallback', 'demo-store'].includes(seedInfo.source);
  const source = offline ? ' (demo mode — DB not connected)' : '';
  showHint('seedStatus', `Loaded seed data${source}. Click "Use Client A" then try Quick Actions.`);
  return seedInfo;
}

function useClient(key) {
  if (!seedInfo) {
    showHint('seedStatus', 'Click "Load Seed IDs" first.');
    return;
  }
  const client = seedInfo.clients[key];
  if (!client) {
    showHint('seedStatus', `Client "${key}" not found in seed data.`);
    return;
  }
  $('clientId').value = client.id;
  $('userId').value = client.userId;
  saveConfig();
  showHint('seedStatus', `Using ${client.name}`);
}

function fillClientAExample() {
  if (!seedInfo) {
    showHint('seedStatus', 'Click "Load Seed IDs" first.');
    return;
  }
  useClient('clientA');
  const ex = seedInfo.examples?.clientATransfer;
  if (!ex) return;
  $('productId').value = ex.productId;
  $('fromBinId').value = ex.fromBinId;
  $('toBinId').value = ex.toBinId;
  $('batchNumber').value = ex.batchNumber;
  $('expiryDate').value = ex.expiryDate;
  $('quantity').value = ex.quantity;
  saveConfig();
}

$('loadSeedBtn').addEventListener('click', loadSeedInfo);
$('useClientABtn').addEventListener('click', () => useClient('clientA'));
$('useClientBBtn').addEventListener('click', () => useClient('clientB'));
$('saveConfigBtn').addEventListener('click', saveConfig);
$('fillClientABtn').addEventListener('click', fillClientAExample);

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    saveConfig();
    const action = btn.dataset.action;
    if (action === 'inventory') await api('GET', '/api/inventory');
    if (action === 'billing') await api('POST', '/api/billing/generate', { month: $('invoiceMonth').value });
    if (action === 'audit') await api('GET', '/api/audit-logs');
  });
});

$('transferBtn').addEventListener('click', async () => {
  saveConfig();
  await api('POST', '/api/inventory/transfer', {
    productId: $('productId').value.trim(),
    fromBinId: $('fromBinId').value.trim(),
    toBinId: $('toBinId').value.trim(),
    batchNumber: $('batchNumber').value.trim(),
    expiryDate: $('expiryDate').value,
    quantity: Number($('quantity').value),
  });
});

$('getInvoiceBtn').addEventListener('click', async () => {
  saveConfig();
  const id = $('invoiceId').value.trim();
  if (!id) return showResponse(0, { error: 'Enter an invoice ID first (from Generate Invoice response).' });
  await api('GET', `/api/invoices/${id}`);
});

$('testInsufficientBtn').addEventListener('click', async () => {
  saveConfig();
  fillClientAExample();
  await api('POST', '/api/inventory/transfer', {
    productId: $('productId').value.trim(),
    fromBinId: $('fromBinId').value.trim(),
    toBinId: $('toBinId').value.trim(),
    batchNumber: $('batchNumber').value.trim(),
    expiryDate: $('expiryDate').value,
    quantity: 9999,
  });
});

$('testSameBinBtn').addEventListener('click', async () => {
  saveConfig();
  fillClientAExample();
  const binId = $('fromBinId').value.trim();
  await api('POST', '/api/inventory/transfer', {
    productId: $('productId').value.trim(),
    fromBinId: binId,
    toBinId: binId,
    batchNumber: $('batchNumber').value.trim(),
    expiryDate: $('expiryDate').value,
    quantity: 10,
  });
});

$('testNoTenantBtn').addEventListener('click', async () => {
  await api('GET', '/api/inventory', null, true);
});

loadConfig();
