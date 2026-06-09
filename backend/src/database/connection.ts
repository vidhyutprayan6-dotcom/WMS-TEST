import prisma from './prisma';

let dbAvailable: boolean | null = null;

export async function isDatabaseAvailable(): Promise<boolean> {
  if (process.env.USE_DEMO_MODE === 'true') return false;
  if (dbAvailable !== null) return dbAvailable;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    console.warn('⚠ Database unavailable — using in-memory demo store for API responses.');
    console.warn('  For production: set DATABASE_URL on Railway and run prisma db seed.');
  }

  return dbAvailable;
}

export function resetDbCheck(): void {
  dbAvailable = null;
}
