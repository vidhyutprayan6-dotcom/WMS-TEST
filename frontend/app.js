const $ = (id) => document.getElementById(id);

const LOCAL_API_URL = 'http://localhost:3006';
const CONFIG_VERSION = '5';

const ERROR_TITLES = {
  INSUFFICIENT_STOCK: 'Insufficient stock',
  SAME_BIN_TRANSFER: 'Same bin transfer',
  BIN_CAPACITY_EXCEEDED: 'Bin capacity exceeded',
  VALIDATION_ERROR: 'Validation error',
  TENANT_MISMATCH: 'Tenant mismatch',
  PRODUCT_NOT_FOUND: 'Product not found',
  INVENTORY_NOT_FOUND: 'Inventory not found',
  BIN_NOT_FOUND: 'Bin not found',
  INVOICE_NOT_FOUND: 'Invoice not found',
  BILLING_CONTEXT_NOT_FOUND: 'Billing not configured',
  DATABASE_ERROR: 'Database error',
  INTERNAL_ERROR: 'Server error',
  MISSING_TENANT: 'Missing tenant headers',
};

function isProductionHost() {
  const host = window.location.hostname;
  return host.endsWith('.vercel.app') || host.endsWith('.railway.app');
}

const fields = ['baseUrl', 'clientId', 'userId', 'invoiceMonth', 'productId', 'fromBinId', 'toBinId', 'batchNumber', 'expiryDate', 'quantity', 'invoiceId'];

function normalizeBaseUrl(url) {
  let u = (url || '').trim().replace(/\/$/, '');
  if (!u) return LOCAL_API_URL;
  u = u.replace('http://localhost:3000', LOCAL_API_URL);
  u = u.replace('http://127.0.0.1:3000', LOCAL_API_URL);
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('localhost') || u.startsWith('127.0.0.1')) return `http://${u}`;
  return `https://${u}`;
}

function getDefaultBaseUrl() {
  const built = window.API_BASE_URL || LOCAL_API_URL;
  if (isProductionHost() && built && !built.includes('localhost')) return normalizeBaseUrl(built);
  return normalizeBaseUrl(built);
}

function getBaseUrl() {
  return normalizeBaseUrl($('baseUrl').value);
}

function migrateStorage() {
  const savedVersion = localStorage.getItem('wms_configVersion');
  if (savedVersion === CONFIG_VERSION) return;
  const savedBase = localStorage.getItem('wms_baseUrl') || '';
  if (isProductionHost() && (savedBase.includes('localhost') || savedBase.includes('127.0.0.1'))) {
    localStorage.removeItem('wms_baseUrl');
  }
  if (!isProductionHost() && (!savedBase || savedBase.includes('localhost:3000') || savedBase.includes('127.0.0.1:3000'))) {
    localStorage.setItem('wms_baseUrl', LOCAL_API_URL);
  }
  const savedClient = localStorage.getItem('wms_clientId') || '';
  if (savedClient.includes('00000000-0000-0000-0000-0000000000')) {
    localStorage.removeItem('wms_clientId');
    localStorage.removeItem('wms_userId');
  }
  localStorage.setItem('wms_configVersion', CONFIG_VERSION);
}

function loadConfig() {
  migrateStorage();
  const defaultUrl = getDefaultBaseUrl();
  if (isProductionHost()) {
    $('baseUrl').value = defaultUrl;
    localStorage.setItem('wms_baseUrl', defaultUrl);
  } else {
    const savedBase = localStorage.getItem('wms_baseUrl');
    $('baseUrl').value = normalizeBaseUrl(savedBase || defaultUrl);
  }
  fields.filter((k) => k !== 'baseUrl').forEach((key) => {
    const saved = localStorage.getItem(`wms_${key}`);
    if (saved && $(key)) $(key).value = saved;
  });
}

function saveConfig(silent = false) {
  const normalized = getBaseUrl();
  $('baseUrl').value = normalized;
  localStorage.setItem('wms_configVersion', CONFIG_VERSION);
  fields.forEach((key) => {
    if ($(key)) localStorage.setItem(`wms_${key}`, $(key).value);
  });
  showHint('seedStatus', 'Config saved. API URL: ' + normalized);
  if (!silent) showToast('success', 'Config saved', `API URL: ${normalized}`);
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {'success'|'error'|'warning'|'info'} type */
function showToast(type, title, message, durationMs = 5000) {
  const container = $('toastContainer');
  if (!container) return;

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${icons[type] || 'ℹ'}</div>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-msg">${escapeHtml(message)}</div>
    </div>
    <button type="button" class="toast-close" aria-label="Dismiss">×</button>
    <div class="toast-progress"></div>
  `;

  const progress = el.querySelector('.toast-progress');
  progress.style.animationDuration = `${durationMs}ms`;

  el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));
  container.appendChild(el);

  while (container.children.length > 5) {
    container.removeChild(container.firstChild);
  }

  const timer = setTimeout(() => dismissToast(el), durationMs);
  el._timer = timer;
}

function dismissToast(el) {
  if (!el || el.classList.contains('toast-out')) return;
  clearTimeout(el._timer);
  el.classList.add('toast-out');
  setTimeout(() => el.remove(), 300);
}

function extractErrorMessage(data) {
  if (!data) return 'Unknown error';
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error && typeof data.error === 'string') return data.error;
  return 'Request failed';
}

function buildSuccessToast(method, path, data) {
  const payload = data?.data;
  if (path === '/api/config/seed-info') {
    const src = payload?.source === 'database' ? 'from database' : 'demo/offline mode';
    return { title: 'Seed IDs loaded', message: `Test data ready (${src}). Use Client A or B.` };
  }
  if (path === '/api/inventory' && Array.isArray(payload)) {
    return { title: 'Inventory listed', message: `${payload.length} stock record(s) for this tenant.` };
  }
  if (path === '/api/billing/generate' && payload) {
    const total = payload.totals?.grandTotal ?? payload.grandTotal;
    return {
      title: 'Invoice generated',
      message: `Month ${payload.month}: total $${Number(total).toFixed(2)} · ID ${payload.invoiceId}`,
    };
  }
  if (path.startsWith('/api/invoices/') && payload) {
    return {
      title: 'Invoice retrieved',
      message: `${payload.month} · total $${Number(payload.totals?.grandTotal).toFixed(2)}`,
    };
  }
  if (path === '/api/audit-logs' && Array.isArray(payload)) {
    return { title: 'Audit logs loaded', message: `${payload.length} audit entry(ies) found.` };
  }
  if (path === '/api/inventory/transfer' && payload) {
    return {
      title: 'Transfer completed',
      message: `${payload.quantity} units: ${payload.fromBin} → ${payload.toBin} (${payload.beforeQty} → ${payload.afterQty})`,
    };
  }
  return { title: 'Success', message: `${method} ${path} completed.` };
}

function buildErrorToast(method, path, status, data) {
  const code = data?.error || 'ERROR';
  const title = ERROR_TITLES[code] || (status === 400 ? 'Validation failed' : 'Request failed');
  const message = extractErrorMessage(data);
  return { title, message: `[${code}] ${message}` };
}

function toastForRequest(method, path, status, data) {
  const ok = status >= 200 && status < 300;
  if (ok) {
    const { title, message } = buildSuccessToast(method, path, data);
    showToast('success', title, message);
  } else {
    const { title, message } = buildErrorToast(method, path, status, data);
    const type = status === 400 ? 'warning' : 'error';
    showToast(type, title, message, 7000);
  }
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.startsWith('<!') || text.startsWith('The page')) {
      throw new Error(
        `Server returned HTML instead of JSON (status ${res.status}). Check API Base URL.`
      );
    }
    return text;
  }
}

function validateTenantHeaders() {
  const clientId = $('clientId').value.trim();
  const userId = $('userId').value.trim();
  if (!clientId || !userId) {
    showToast('warning', 'Missing tenant headers', 'Set x-client-id and x-user-id — click Load Seed IDs, then Use Client A.');
    showResponse(0, { success: false, error: 'MISSING_TENANT', message: 'x-client-id and x-user-id are required.' });
    return false;
  }
  return true;
}

async function api(method, path, body, skipHeaders = false) {
  const baseUrl = getBaseUrl();
  $('baseUrl').value = baseUrl;

  if (!skipHeaders && !validateTenantHeaders()) {
    return { status: 0, data: { error: 'MISSING_TENANT' } };
  }

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
    toastForRequest(method, path, res.status, data);
    return { status: res.status, data };
  } catch (err) {
    const message = err.message?.includes('fetch')
      ? `Cannot reach backend at ${baseUrl}. Start: cd backend && npm run dev`
      : err.message;
    showResponse(0, { success: false, error: message });
    showHint('seedStatus', message);
    showToast('error', 'Network error', message, 8000);
    return { status: 0, data: { error: message } };
  }
}

let seedInfo = null;

async function loadSeedInfo() {
  const result = await api('GET', '/api/config/seed-info', null, true);
  if (result.status !== 200 || !result.data?.data) {
    showToast('error', 'Seed load failed', 'Could not load test IDs from the API.');
    return null;
  }
  seedInfo = result.data.data;
  const offline = ['static-fallback', 'demo-store'].includes(seedInfo.source);
  const source = offline ? ' (demo mode)' : ' (from database)';
  showHint('seedStatus', `Loaded seed data${source}. Click "Use Client A" then try Quick Actions.`);
  return seedInfo;
}

function useClient(key) {
  if (!seedInfo) {
    showToast('warning', 'Load seed first', 'Click "Load Seed IDs" before selecting a client.');
    showHint('seedStatus', 'Click "Load Seed IDs" first.');
    return;
  }
  const client = seedInfo.clients[key];
  if (!client) {
    showToast('error', 'Client not found', `No seed data for "${key}".`);
    return;
  }
  $('clientId').value = client.id;
  $('userId').value = client.userId;
  saveConfig(true);
  showHint('seedStatus', `Using ${client.name}`);
  showToast('success', `Tenant: ${client.name}`, `Client ID and User ID applied.`);
}

function fillClientAExample() {
  if (!seedInfo) {
    showToast('warning', 'Load seed first', 'Click "Load Seed IDs" first.');
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
  saveConfig(true);
  showToast('info', 'Transfer form filled', 'Client A example — ready to Execute Transfer.');
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
  if (!id) {
    showResponse(0, { error: 'Enter an invoice ID first.' });
    showToast('warning', 'Invoice ID required', 'Generate an invoice first, then paste the invoice ID.');
    return;
  }
  await api('GET', `/api/invoices/${id}`);
});

$('testInsufficientBtn').addEventListener('click', async () => {
  saveConfig();
  fillClientAExample();
  showToast('info', 'Edge case test', 'Attempting transfer with quantity 9999 (expect insufficient stock).', 3000);
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
  showToast('info', 'Edge case test', 'Same source and destination bin (expect validation error).', 3000);
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
  showToast('info', 'Edge case test', 'Request without tenant headers (expect 401/403).', 3000);
  await api('GET', '/api/inventory', null, true);
});

loadConfig();
showToast('info', 'WMS Test Console ready', 'Load Seed IDs → Use Client A → try Quick Actions.', 4000);
