const $ = (id) => document.getElementById(id);

const LOCAL_API_URL = 'http://localhost:3006';
const CONFIG_VERSION = '6';

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

const fields = [
  'baseUrl', 'clientId', 'userId', 'invoiceMonth',
  'productId', 'fromBinId', 'toBinId', 'batchNumber', 'expiryDate', 'quantity',
];

const TESTS = {
  setup: {
    id: 'setup',
    title: 'Connection & Tenant',
    summary: 'Configure API URL and tenant headers. Seed data auto-fills all test conditions.',
    method: null,
    runLabel: 'Save Config',
  },
  inventory: {
    id: 'inventory',
    title: 'List Inventory',
    summary: 'GET /api/inventory — lists all stock records for the selected tenant.',
    method: 'GET',
    path: '/api/inventory',
    runLabel: 'Run Test',
  },
  billing: {
    id: 'billing',
    title: 'Generate Invoice',
    summary: 'POST /api/billing/generate — creates a monthly 3PL storage invoice. Results show a formatted PDF preview.',
    method: 'POST',
    path: '/api/billing/generate',
    runLabel: 'Generate Invoice',
  },
  transfer: {
    id: 'transfer',
    title: 'Inventory Transfer',
    summary: 'POST /api/inventory/transfer — bin-to-bin move with batch/lot and expiry traceability.',
    method: 'POST',
    path: '/api/inventory/transfer',
    runLabel: 'Execute Transfer',
  },
  audit: {
    id: 'audit',
    title: 'Audit Logs',
    summary: 'GET /api/audit-logs — retrieves the audit trail for the selected tenant.',
    method: 'GET',
    path: '/api/audit-logs',
    runLabel: 'Run Test',
  },
  'edge-insufficient': {
    id: 'edge-insufficient',
    title: 'Insufficient Stock',
    summary: 'Attempts a transfer with quantity 9999. Expects INSUFFICIENT_STOCK validation error.',
    method: 'POST',
    path: '/api/inventory/transfer',
    runLabel: 'Run Edge Test',
    edge: true,
  },
  'edge-samebin': {
    id: 'edge-samebin',
    title: 'Same Bin Transfer',
    summary: 'Transfers from a bin to itself. Expects SAME_BIN_TRANSFER validation error.',
    method: 'POST',
    path: '/api/inventory/transfer',
    runLabel: 'Run Edge Test',
    edge: true,
  },
  'edge-notenant': {
    id: 'edge-notenant',
    title: 'Missing Tenant Headers',
    summary: 'Calls GET /api/inventory without x-client-id / x-user-id. Expects auth/tenant rejection.',
    method: 'GET',
    path: '/api/inventory',
    runLabel: 'Run Edge Test',
    edge: true,
    skipHeaders: true,
  },
};

let seedInfo = null;
let currentTestId = 'setup';
let lastResponse = null;
let lastInvoiceData = null;
let pdfPreviewUrl = null;
let showJson = false;

function isProductionHost() {
  const host = window.location.hostname;
  return host.endsWith('.vercel.app') || host.endsWith('.railway.app');
}

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
  localStorage.removeItem('wms_invoiceId');
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
  if (!$('invoiceMonth').value) $('invoiceMonth').value = '2025-12';
  if (!$('batchNumber').value) $('batchNumber').value = 'LOT-001';
  if (!$('expiryDate').value) $('expiryDate').value = '2027-01-01';
  if (!$('quantity').value) $('quantity').value = '20';
  updateStatusBar();
}

function saveConfig(silent = false) {
  syncConditionsFromDom();
  const normalized = getBaseUrl();
  $('baseUrl').value = normalized;
  localStorage.setItem('wms_configVersion', CONFIG_VERSION);
  fields.forEach((key) => {
    if ($(key)) localStorage.setItem(`wms_${key}`, $(key).value);
  });
  updateStatusBar();
  if (!silent) showToast('success', 'Config saved', `API URL: ${normalized}`);
}

function updateStatusBar() {
  const baseUrl = getBaseUrl();
  const host = baseUrl.replace(/^https?:\/\//, '');
  const conn = $('connectionStatus');
  if (conn) {
    conn.innerHTML = `<span class="status-dot"></span> ${escapeHtml(host)}`;
    conn.className = 'status-dot-label';
  }

  const clientId = ($('clientId').value || '').trim();
  const userId = ($('userId').value || '').trim();
  const tenant = $('tenantStatus');
  let tenantLabel = 'No tenant';
  let activeClient = null;

  if (clientId && userId) {
    if (seedInfo?.clients?.clientA?.id === clientId) {
      tenantLabel = 'Client A';
      activeClient = 'clientA';
    } else if (seedInfo?.clients?.clientB?.id === clientId) {
      tenantLabel = 'Client B';
      activeClient = 'clientB';
    } else {
      tenantLabel = 'Tenant set';
    }
  }

  if (tenant) {
    tenant.innerHTML = `<span class="status-dot"></span> ${escapeHtml(tenantLabel)}`;
    tenant.className = clientId && userId ? 'status-dot-label' : 'status-dot-label muted';
  }

  const metricApi = $('metricApi');
  if (metricApi) metricApi.textContent = host;

  const metricTenant = $('metricTenant');
  if (metricTenant) metricTenant.textContent = tenantLabel;

  const metricMonth = $('metricMonth');
  if (metricMonth) metricMonth.textContent = $('invoiceMonth').value || '2025-12';

  updateClientPills(activeClient);
}

function updateClientPills(activeKey) {
  $('useClientABtn')?.classList.toggle('active', activeKey === 'clientA');
  $('useClientBBtn')?.classList.toggle('active', activeKey === 'clientB');
}

function setMetricStatus(status, ok) {
  const el = $('metricStatus');
  if (!el) return;
  el.textContent = ok ? `${status} OK` : status ? `${status} Failed` : 'Error';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    <div class="toast-progress"></div>`;
  el.querySelector('.toast-progress').style.animationDuration = `${durationMs}ms`;
  el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));
  container.appendChild(el);
  while (container.children.length > 5) container.removeChild(container.firstChild);
  el._timer = setTimeout(() => dismissToast(el), durationMs);
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
    return { title: 'Seed IDs loaded', message: `Test data ready (${src}). Client A applied.` };
  }
  if (path === '/api/inventory' && Array.isArray(payload)) {
    return { title: 'Inventory listed', message: `${payload.length} stock record(s) for this tenant.` };
  }
  if (path === '/api/billing/generate' && payload) {
    const total = payload.totals?.grandTotal ?? payload.grandTotal;
    return { title: 'Invoice generated', message: `Month ${payload.month}: total $${Number(total).toFixed(2)}` };
  }
  if (path === '/api/audit-logs' && Array.isArray(payload)) {
    return { title: 'Audit logs loaded', message: `${payload.length} audit entry(ies) found.` };
  }
  if (path === '/api/inventory/transfer' && payload) {
    return {
      title: 'Transfer completed',
      message: `${payload.quantity} units: ${payload.fromBin} → ${payload.toBin}`,
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
    showToast(status === 400 ? 'warning' : 'error', title, message, 7000);
  }
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.startsWith('<!') || text.startsWith('The page')) {
      throw new Error(`Server returned HTML instead of JSON (status ${res.status}). Check API Base URL.`);
    }
    return text;
  }
}

function validateTenantHeaders() {
  const clientId = $('clientId').value.trim();
  const userId = $('userId').value.trim();
  if (!clientId || !userId) {
    showToast('warning', 'Missing tenant headers', 'Load Seed IDs first — Client A is applied automatically.');
    showResults(0, { success: false, error: 'MISSING_TENANT', message: 'x-client-id and x-user-id are required.' });
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
    showResults(res.status, data, method, path);
    toastForRequest(method, path, res.status, data);
    return { status: res.status, data };
  } catch (err) {
    const message = err.message?.includes('fetch')
      ? `Cannot reach backend at ${baseUrl}. Start: cd backend && npm run dev`
      : err.message;
    showResults(0, { success: false, error: message });
    showToast('error', 'Network error', message, 8000);
    return { status: 0, data: { error: message } };
  }
}

function revokePdfUrl() {
  if (pdfPreviewUrl) {
    URL.revokeObjectURL(pdfPreviewUrl);
    pdfPreviewUrl = null;
  }
}

function showResults(status, data, method, path) {
  lastResponse = { status, data, method, path };
  showJson = false;

  const badge = $('statusBadge');
  badge.textContent = status || '—';
  badge.className = 'badge ' + (status >= 200 && status < 300 ? 'ok' : 'err');
  setMetricStatus(status, status >= 200 && status < 300);

  $('jsonOutput').textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  $('jsonOutput').classList.add('hidden');
  $('toggleJsonBtn').classList.add('hidden');
  $('downloadPdfBtn').classList.add('hidden');
  revokePdfUrl();

  const body = $('resultsBody');
  body.classList.remove('hidden');
  const ok = status >= 200 && status < 300;
  const payload = data?.data;

  if (!ok) {
    body.innerHTML = `<div class="error-box"><strong>Error ${status || ''}</strong><br>${escapeHtml(extractErrorMessage(data))}${data?.error ? `<br><code>${escapeHtml(data.error)}</code>` : ''}</div>`;
    $('toggleJsonBtn').classList.remove('hidden');
    return;
  }

  if (path === '/api/billing/generate' && payload) {
    lastInvoiceData = payload;
    renderInvoiceResults(payload);
    $('downloadPdfBtn').classList.remove('hidden');
    $('toggleJsonBtn').classList.remove('hidden');
    return;
  }

  if (path === '/api/inventory' && Array.isArray(payload)) {
    body.innerHTML = renderInventoryTable(payload);
    $('toggleJsonBtn').classList.remove('hidden');
    return;
  }

  if (path === '/api/audit-logs' && Array.isArray(payload)) {
    body.innerHTML = renderAuditTable(payload);
    $('toggleJsonBtn').classList.remove('hidden');
    return;
  }

  if (path === '/api/inventory/transfer' && payload) {
    body.innerHTML = `
      <div class="result-summary"><p class="ok-text">Transfer successful</p></div>
      <dl class="test-info">
        <dt>From → To</dt><dd>${escapeHtml(payload.fromBin)} → ${escapeHtml(payload.toBin)}</dd>
        <dt>Quantity</dt><dd>${payload.quantity}</dd>
        <dt>Stock change</dt><dd>${payload.beforeQty} → ${payload.afterQty}</dd>
        <dt>Batch</dt><dd>${escapeHtml(payload.batchNumber)}</dd>
      </dl>`;
    $('toggleJsonBtn').classList.remove('hidden');
    return;
  }

  body.innerHTML = `<div class="result-summary"><p class="ok-text">Request completed successfully.</p></div>`;
  $('toggleJsonBtn').classList.remove('hidden');
}

function renderInvoiceResults(invoice) {
  const body = $('resultsBody');
  pdfPreviewUrl = InvoicePdf.previewUrl({ data: invoice });
  body.innerHTML = `
    ${InvoicePdf.renderHtml({ data: invoice })}
    <div class="pdf-frame-wrap">
      <iframe title="Invoice PDF preview" src="${pdfPreviewUrl}"></iframe>
    </div>`;
}

function renderInventoryTable(items) {
  if (!items.length) return '<p class="placeholder">No inventory records for this tenant.</p>';
  const rows = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.productName || item.productId)}</td>
      <td>${escapeHtml(item.binCode || item.binId)}</td>
      <td class="num">${item.quantity}</td>
      <td>${escapeHtml(item.batchNumber || '—')}</td>
      <td>${escapeHtml(item.expiryDate || '—')}</td>
    </tr>`).join('');
  return `
    <div class="result-summary"><p class="ok-text">${items.length} stock record(s)</p></div>
    <table class="data-table">
      <thead><tr><th>Product</th><th>Bin</th><th>Qty</th><th>Batch</th><th>Expiry</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderAuditTable(logs) {
  if (!logs.length) return '<p class="placeholder">No audit entries for this tenant.</p>';
  const rows = logs.slice(0, 50).map((log) => `
    <tr>
      <td>${escapeHtml(log.action || '—')}</td>
      <td>${escapeHtml(log.entityType || '—')}</td>
      <td>${escapeHtml((log.createdAt || '').slice(0, 19).replace('T', ' '))}</td>
    </tr>`).join('');
  return `
    <div class="result-summary"><p class="ok-text">${logs.length} audit entry(ies)</p></div>
    <table class="data-table">
      <thead><tr><th>Action</th><th>Entity</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function syncConditionsFromDom() {
  const container = $('conditionsBody');
  container.querySelectorAll('[data-field]').forEach((el) => {
    const key = el.dataset.field;
    if ($(key)) $(key).value = el.value;
  });
}

function renderConditions(testId) {
  const test = TESTS[testId];
  $('testTitle').textContent = test.title;
  $('testSummary').textContent = test.summary;
  $('runTestBtn').textContent = test.runLabel || 'Run Test';
  $('runTestBtn').className = test.edge ? 'btn-danger' : 'btn-primary';

  const container = $('conditionsBody');
  const v = (key) => ($(key)?.value || '').trim();

  if (testId === 'setup') {
    container.innerHTML = `
      <div class="test-info">
        <dl>
          <dt>API endpoint</dt><dd>${escapeHtml(v('baseUrl') || getDefaultBaseUrl())}</dd>
          <dt>Swagger docs</dt><dd>${escapeHtml(v('baseUrl') || getDefaultBaseUrl())}/api/docs</dd>
        </dl>
      </div>
      <div class="grid-1">
        <label>API Base URL<input type="text" data-field="baseUrl" value="${escapeHtml(v('baseUrl') || getDefaultBaseUrl())}" /></label>
        <label>x-client-id<input type="text" data-field="clientId" value="${escapeHtml(v('clientId'))}" placeholder="Auto-filled from seed" /></label>
        <label>x-user-id<input type="text" data-field="userId" value="${escapeHtml(v('userId'))}" placeholder="Auto-filled from seed" /></label>
      </div>
      <p class="hint">Click <strong>Load Seed IDs</strong> above — Client A is applied automatically.</p>`;
    return;
  }

  if (testId === 'billing') {
    container.innerHTML = `
      <div class="test-info"><dl>
        <dt>Endpoint</dt><dd>POST /api/billing/generate</dd>
        <dt>Tenant</dt><dd>${escapeHtml(v('clientId') || 'Not set')}</dd>
      </dl></div>
      <div class="grid-1">
        <label>Invoice Month (YYYY-MM)<input type="text" data-field="invoiceMonth" value="${escapeHtml(v('invoiceMonth') || '2025-12')}" /></label>
      </div>
      <p class="hint">Results appear as a formatted table and PDF preview.</p>`;
    return;
  }

  if (testId === 'transfer' || (testId.startsWith('edge-') && testId !== 'edge-notenant')) {
    const isEdge = testId.startsWith('edge-');
    container.innerHTML = `
      <div class="test-info"><dl>
        <dt>Endpoint</dt><dd>POST /api/inventory/transfer</dd>
        <dt>Expected</dt><dd>${isEdge ? (testId === 'edge-insufficient' ? 'INSUFFICIENT_STOCK error' : 'SAME_BIN_TRANSFER error') : 'Successful bin-to-bin move'}</dd>
      </dl></div>
      <div class="grid-2">
        <label>Product ID<input type="text" data-field="productId" value="${escapeHtml(v('productId'))}" /></label>
        <label>Quantity<input type="number" data-field="quantity" value="${escapeHtml(v('quantity') || '20')}" min="1" /></label>
        <label>From Bin ID<input type="text" data-field="fromBinId" value="${escapeHtml(v('fromBinId'))}" /></label>
        <label>To Bin ID<input type="text" data-field="toBinId" value="${escapeHtml(v('toBinId'))}" /></label>
        <label>Batch Number<input type="text" data-field="batchNumber" value="${escapeHtml(v('batchNumber') || 'LOT-001')}" /></label>
        <label>Expiry Date<input type="date" data-field="expiryDate" value="${escapeHtml(v('expiryDate') || '2027-01-01')}" /></label>
      </div>
      ${!isEdge ? '<p class="hint">Transfer fields are pre-filled from Client A seed data.</p>' : ''}`;
    return;
  }

  if (testId === 'edge-notenant') {
    container.innerHTML = `
      <div class="test-info"><dl>
        <dt>Endpoint</dt><dd>GET /api/inventory (no tenant headers)</dd>
        <dt>Expected</dt><dd>401/403 or MISSING_TENANT rejection</dd>
      </dl></div>
      <p class="hint">No configuration needed — this test deliberately omits x-client-id and x-user-id.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="test-info"><dl>
      <dt>Endpoint</dt><dd>${escapeHtml(test.method)} ${escapeHtml(test.path)}</dd>
      <dt>Tenant</dt><dd>${escapeHtml(v('clientId') || 'Not set — load seed first')}</dd>
    </dl></div>
    <p class="hint">Uses current tenant from header bar. No additional input required.</p>`;
}

function selectTest(testId) {
  currentTestId = testId;
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.test === testId);
  });
  renderConditions(testId);
}

async function loadSeedInfo() {
  const result = await api('GET', '/api/config/seed-info', null, true);
  if (result.status !== 200 || !result.data?.data) {
    showToast('error', 'Seed load failed', 'Could not load test IDs from the API.');
    return null;
  }
  seedInfo = result.data.data;
  useClient('clientA');
  fillClientAExample(true);
  updateStatusBar();
  renderConditions(currentTestId);
  return seedInfo;
}

function useClient(key) {
  if (!seedInfo) {
    showToast('warning', 'Load seed first', 'Click "Load Seed IDs" in the header.');
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
  updateStatusBar();
  renderConditions(currentTestId);
  showToast('success', `Tenant: ${client.name}`, 'Client ID and User ID applied.');
}

function fillClientAExample(silent = false) {
  if (!seedInfo) return;
  const ex = seedInfo.examples?.clientATransfer;
  if (!ex) return;
  $('productId').value = ex.productId;
  $('fromBinId').value = ex.fromBinId;
  $('toBinId').value = ex.toBinId;
  $('batchNumber').value = ex.batchNumber;
  $('expiryDate').value = ex.expiryDate;
  $('quantity').value = ex.quantity;
  saveConfig(true);
  if (!silent) showToast('info', 'Transfer form filled', 'Client A example ready.');
}

async function runCurrentTest() {
  syncConditionsFromDom();
  saveConfig(true);

  if (currentTestId === 'setup') {
    saveConfig(false);
    return;
  }

  if (currentTestId === 'inventory') {
    await api('GET', '/api/inventory');
    return;
  }

  if (currentTestId === 'billing') {
    await api('POST', '/api/billing/generate', { month: $('invoiceMonth').value.trim() });
    return;
  }

  if (currentTestId === 'transfer') {
    await api('POST', '/api/inventory/transfer', {
      productId: $('productId').value.trim(),
      fromBinId: $('fromBinId').value.trim(),
      toBinId: $('toBinId').value.trim(),
      batchNumber: $('batchNumber').value.trim(),
      expiryDate: $('expiryDate').value,
      quantity: Number($('quantity').value),
    });
    return;
  }

  if (currentTestId === 'audit') {
    await api('GET', '/api/audit-logs');
    return;
  }

  if (currentTestId === 'edge-insufficient') {
    fillClientAExample(true);
    syncConditionsFromDom();
    showToast('info', 'Edge case test', 'Transfer qty 9999 — expect insufficient stock.', 3000);
    await api('POST', '/api/inventory/transfer', {
      productId: $('productId').value.trim(),
      fromBinId: $('fromBinId').value.trim(),
      toBinId: $('toBinId').value.trim(),
      batchNumber: $('batchNumber').value.trim(),
      expiryDate: $('expiryDate').value,
      quantity: 9999,
    });
    return;
  }

  if (currentTestId === 'edge-samebin') {
    fillClientAExample(true);
    syncConditionsFromDom();
    const binId = $('fromBinId').value.trim();
    showToast('info', 'Edge case test', 'Same source and destination bin.', 3000);
    await api('POST', '/api/inventory/transfer', {
      productId: $('productId').value.trim(),
      fromBinId: binId,
      toBinId: binId,
      batchNumber: $('batchNumber').value.trim(),
      expiryDate: $('expiryDate').value,
      quantity: 10,
    });
    return;
  }

  if (currentTestId === 'edge-notenant') {
    showToast('info', 'Edge case test', 'Request without tenant headers.', 3000);
    await api('GET', '/api/inventory', null, true);
  }
}

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => selectTest(btn.dataset.test));
});

$('loadSeedBtn').addEventListener('click', loadSeedInfo);
$('useClientABtn').addEventListener('click', () => {
  if (!seedInfo) loadSeedInfo().then(() => useClient('clientA'));
  else useClient('clientA');
});
$('useClientBBtn').addEventListener('click', () => {
  if (!seedInfo) loadSeedInfo().then(() => useClient('clientB'));
  else useClient('clientB');
});
$('runTestBtn').addEventListener('click', runCurrentTest);

$('toggleJsonBtn').addEventListener('click', () => {
  showJson = !showJson;
  $('jsonOutput').classList.toggle('hidden', !showJson);
  $('resultsBody').classList.toggle('hidden', showJson);
  $('toggleJsonBtn').textContent = showJson ? 'Show Preview' : 'Show JSON';
});

$('downloadPdfBtn').addEventListener('click', () => {
  if (!lastInvoiceData) {
    showToast('warning', 'No invoice', 'Generate an invoice first.');
    return;
  }
  InvoicePdf.download({ data: lastInvoiceData });
  showToast('success', 'PDF downloaded', `invoice-${lastInvoiceData.month}.pdf`);
});

$('navSearch')?.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.nav-item').forEach((btn) => {
    const match = btn.textContent.toLowerCase().includes(q);
    btn.classList.toggle('hidden-by-search', Boolean(q) && !match);
  });
});

loadConfig();
selectTest('setup');
showToast('info', 'Test Platform ready', 'Load Seed IDs to begin — tests run from the sidebar.', 4000);
