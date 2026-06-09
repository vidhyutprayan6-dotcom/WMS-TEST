import 'dotenv/config';
import app from './app';
import { bootstrapDatabase } from './bootstrap';
import { isDatabaseAvailable } from './database/connection';

const PORT = Number(process.env.PORT) || 3006;
const HOST = '0.0.0.0';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`WMS 3PL Backend listening on ${HOST}:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);

  void (async () => {
    await bootstrapDatabase();
    const dbOk = await isDatabaseAvailable();
    const demo = process.env.NODE_ENV !== 'production' && !dbOk;
    console.log(`Database: ${dbOk ? 'connected' : demo ? 'demo mode (local only)' : 'NOT CONNECTED'}`);
    if (dbOk) {
      console.log(`Swagger docs: http://0.0.0.0:${PORT}/api/docs`);
    }
  })();
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop other servers or change PORT in .env`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
