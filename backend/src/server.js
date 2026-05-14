import { createApp } from './app.js';
import { config } from './config.js';

if (config.jwtSecret.length < 16) {
  console.error('JWT_SECRET має бути не коротшим за 16 символів.');
  process.exit(1);
}

const app = createApp();

app.listen(config.port, () => {
  console.log(`API: http://localhost:${config.port}`);
});
