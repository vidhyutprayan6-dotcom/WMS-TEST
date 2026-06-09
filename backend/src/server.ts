import 'dotenv/config';
import app from './app';
import { isDatabaseAvailable } from './database/connection';

const PORT = process.env.PORT || 3006;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const server = app.listen(PORT, async () => {
  const dbOk = await isDatabaseAvailable();
  console.log(`WMS 3PL Backend running on port ${PORT}`);
  console.log(`Database: ${dbOk ? 'connected' : 'demo mode (in-memory)'}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop other servers or change PORT in .env`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
