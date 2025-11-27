import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDatabase } from './config/db.js';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { bootstrapSystemParams } from './services/systemService.js';

async function bootstrap() {
  await connectDatabase();
  await bootstrapSystemParams();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.use('/api', apiRouter);

  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap backend', err);
  process.exit(1);
});

