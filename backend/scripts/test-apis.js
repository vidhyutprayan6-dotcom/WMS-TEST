const BASE = process.env.API_URL || 'http://localhost:3006';

const CLIENT_A = 'a1000000-0000-4000-8000-000000000001';
const USER_A = 'c1000000-0000-4000-8000-000000000001';
const PRODUCT_A = 'f1000000-0000-4000-8000-000000000001';
const BIN_A1 = 'e1000000-0000-4000-8000-000000000001';
const BIN_A2 = 'e1000000-0000-4000-8000-000000000002';

let passed = 0;
let failed = 0;
let invoiceId = null;

async function req(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function ok(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function run() {
  console.log(`\nWMS API Tests → ${BASE}\n`);

  const h = { 'x-client-id': CLIENT_A, 'x-user-id': USER_A };

  const health = await req('GET', '/health');
  ok('GET /health', health.status === 200);

  const seed = await req('GET', '/api/config/seed-info');
  ok('GET /api/config/seed-info', seed.status === 200 && seed.data?.data?.clients?.clientA);

  const inv = await req('GET', '/api/inventory', null, h);
  ok('GET /api/inventory', inv.status === 200 && Array.isArray(inv.data?.data));

  const bill = await req('POST', '/api/billing/generate', { month: '2025-12' }, h);
  ok('POST /api/billing/generate', bill.status === 200 && bill.data?.data?.invoiceId);
  invoiceId = bill.data?.data?.invoiceId;

  if (invoiceId) {
    const getInv = await req('GET', `/api/invoices/${invoiceId}`, null, h);
    ok('GET /api/invoices/:id', getInv.status === 200);
  }

  const audit = await req('GET', '/api/audit-logs', null, h);
  ok('GET /api/audit-logs', audit.status === 200 && Array.isArray(audit.data?.data));

  const transfer = await req('POST', '/api/inventory/transfer', {
    productId: PRODUCT_A,
    fromBinId: BIN_A1,
    toBinId: BIN_A2,
    batchNumber: 'LOT-001',
    expiryDate: '2027-01-01',
    quantity: 20,
  }, h);
  ok('POST /api/inventory/transfer', transfer.status === 200, `qty ${transfer.data?.data?.quantity}`);

  const insuf = await req('POST', '/api/inventory/transfer', {
    productId: PRODUCT_A, fromBinId: BIN_A1, toBinId: BIN_A2,
    batchNumber: 'LOT-001', expiryDate: '2027-01-01', quantity: 9999,
  }, h);
  ok('Validation: insufficient stock → 400', insuf.status === 400 && insuf.data?.error === 'INSUFFICIENT_STOCK', insuf.data?.message);

  const sameBin = await req('POST', '/api/inventory/transfer', {
    productId: PRODUCT_A, fromBinId: BIN_A1, toBinId: BIN_A1,
    batchNumber: 'LOT-001', expiryDate: '2027-01-01', quantity: 10,
  }, h);
  ok('Validation: same bin → 400', sameBin.status === 400 && sameBin.data?.error === 'SAME_BIN_TRANSFER', sameBin.data?.message);

  const noTenant = await req('GET', '/api/inventory');
  ok('Missing tenant headers → 400', noTenant.status === 400 && noTenant.data?.error === 'TENANT_REQUIRED', noTenant.data?.message);

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner failed:', e.message);
  process.exit(1);
});
