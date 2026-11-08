import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './db.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT must be an integer between 0 and 65535.');
}

// Connection only: migrations and seed are explicit administrative commands.
await prisma.$connect();
const server = createApp().listen(port, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') console.log(`API listening on http://127.0.0.1:${address.port}`);
});
server.on('error', () => {
  console.error('Could not start the API listener.');
  void prisma.$disconnect().finally(() => process.exit(1));
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => { void prisma.$disconnect().finally(() => process.exit(0)); });
  });
}
