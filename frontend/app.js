const $ = (id) => document.getElementById(id);

const fields = ['baseUrl', 'clientId', 'userId', 'invoiceMonth', 'productId', 'fromBinId', 'toBinId', 'batchNumber', 'expiryDate', 'quantity', 'invoiceId'];

/** Ensures API URL is absolute (fixes Vercel 404 when https:// is missing). */
function normalizeBaseUrl(url) {
  let u = (url || '').trim().replace(/\/$/, '');
  if (!u) return 'http://localhost:3000';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('localhost') || u.startsWith('127.0.0.1')) {
    return `http://${u}`;
  }
  return `https://${u}`;
}

function getDefaultBaseUrl() {
  return normalizeBaseUrl(window.API_BASE_URL || 'http://localhost:3000');
}

function getBaseUrl() {
  return normalizeBaseUrl($('baseUrl').value);
}

function loadConfig() {
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
  fields.forEach((key) => {
    if ($(key)) localStorage.setItem(`wms_${key}`, $(key).value);
  });
  showHint('seedStatus', 'Config saved to browser localStorage.');
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
        'Check API Base URL includes https:// and points to your Railway backend.'
      );
    }
    return text;
  }
}

async function api(method, path, body, skipHeaders = false) {
  const baseUrl = getBaseUrl();
  const headers = { 'Content-Type': 'application/json' };

  if (!skipHeaders) {
    headers['x-client-id'] = $('clientId').value.trim();
    headers['x-user-id'] = $('userId').value.trim();
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${path}`, opts);
  const data = await parseResponse(res);

  showResponse(res.status, data);
  return { status: res.status, data };
}

let seedInfo = null;

async function loadSeedInfo() {
  try {
    const baseUrl = getBaseUrl();
    $('baseUrl').value = baseUrl;

    const res = await fetch(`${baseUrl}/api/config/seed-info`);
    const json = await parseResponse(res);

    if (!res.ok) {
      throw new Error(json.message || json.error || `Failed to load seed info (${res.status})`);
    }

    if (!json.data) {
      throw new Error('Invalid response — expected { data: ... }. Is the database seeded?');
    }

    seedInfo = json.data;
    showHint('seedStatus', `Loaded seed data (${seedInfo.generatedAt}). Use "Client A" or "Client B" buttons.`);
    showResponse(res.status, json);
    return seedInfo;
  } catch (err) {
    showHint('seedStatus', err.message);
    showResponse(0, { error: err.message, hint: 'API URL must be like https://your-app.up.railway.app' });
    return null;
  }
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
