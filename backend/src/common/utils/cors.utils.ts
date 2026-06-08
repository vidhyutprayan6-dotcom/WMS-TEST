export function getAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://localhost:5173',
    /\.vercel\.app$/,
  ];

  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  return origins;
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  const allowed = getAllowedOrigins();
  return allowed.some((entry) =>
    typeof entry === 'string' ? entry === origin : entry.test(origin)
  );
}
