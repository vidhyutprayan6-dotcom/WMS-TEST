import { execSync } from 'child_process';
import { resetDbCheck } from './database/connection';

export async function bootstrapDatabase(): Promise<void> {
  if (process.env.SKIP_DB_BOOTSTRAP === 'true') {
    console.log('SKIP_DB_BOOTSTRAP=true — skipping migrate/seed');
    return;
  }

  try {
    console.log('Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    console.log('Checking if database needs seed...');
    execSync('npx tsx scripts/seed-if-empty.ts', { stdio: 'inherit' });

    resetDbCheck();
    console.log('Database bootstrap complete.');
  } catch (err) {
    console.error('Database bootstrap failed:', err);
    if (process.env.NODE_ENV === 'production') {
      console.error('Server is running but database may not be ready. Check DATABASE_URL and DIRECT_URL.');
    }
  }
}
