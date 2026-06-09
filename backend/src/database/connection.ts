import prisma from './prisma';

let dbAvailable: boolean | null = null;

export async function isDatabaseAvailable(): Promise<boolean> {
  if (process.env.USE_DEMO_MODE === 'true') {
    dbAvailable = false;
    return false;
  }

  if (dbAvailable !== null) return dbAvailable;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    if (process.env.NODE_ENV === 'production') {
      console.error('Database unavailable in production. Check DATABASE_URL and DIRECT_URL on Railway.');
    } else {
      console.warn('⚠ Database unavailable — using in-memory demo store for API responses.');
      console.warn('  For production: set DATABASE_URL on Railway and run prisma db seed.');
    }
  }

  return dbAvailable;
}

export async function useDemoStore(): Promise<boolean> {
  if (process.env.USE_DEMO_MODE === 'true') return true;
  if (process.env.NODE_ENV === 'production') return false;
  return !(await isDatabaseAvailable());
}

export function resetDbCheck(): void {
  dbAvailable = null;
}
