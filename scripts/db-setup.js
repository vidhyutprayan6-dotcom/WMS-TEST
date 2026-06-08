/**
 * Validates Supabase env vars and runs migrate + seed.
 * Usage: node scripts/db-setup.js
 */
const { execSync } = require('child_process');

function checkEnv() {
  const dbUrl = process.env.DATABASE_URL || '';
  const directUrl = process.env.DIRECT_URL || '';

  const errors = [];

  if (!dbUrl) errors.push('DATABASE_URL is missing');
  if (!directUrl) errors.push('DIRECT_URL is missing');

  if (dbUrl.includes(':5432/') && dbUrl.includes('pooler.supabase.com')) {
    errors.push(
      'DATABASE_URL uses pooler on port 5432 (Transaction mode). Use port 6543 with ?pgbouncer=true instead.'
    );
  }

  if (!dbUrl.includes('6543') && dbUrl.includes('pooler.supabase.com')) {
    errors.push('DATABASE_URL should use Session pooler port 6543 for the running app.');
  }

  if (!directUrl.includes('db.') && directUrl.includes('supabase')) {
    errors.push('DIRECT_URL should use the Direct host: db.[PROJECT-REF].supabase.co');
  }

  if (directUrl.includes('postgres.') && directUrl.includes('db.')) {
    errors.push(
      'DIRECT_URL username should be "postgres" (not "postgres.[PROJECT-REF]"). Check Supabase → Connect → Direct connection.'
    );
  }

  if (errors.length > 0) {
    console.error('\n❌ Supabase connection config errors:\n');
    errors.forEach((e) => console.error(`  • ${e}`));
    console.error('\nSee .env.example or DEPLOYMENT.md for the correct format.\n');
    process.exit(1);
  }

  console.log('✓ DATABASE_URL  → Session pooler (app runtime)');
  console.log('✓ DIRECT_URL    → Direct connection (migrations)\n');
}

checkEnv();

try {
  console.log('Running prisma migrate deploy...\n');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  console.log('\nRunning prisma db seed...\n');
  execSync('npx prisma db seed', { stdio: 'inherit' });

  console.log('\n✅ Database ready! Run: npm run dev\n');
} catch {
  process.exit(1);
}
