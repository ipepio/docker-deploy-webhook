import express, { type Express } from 'express';

import { getConfig } from '../config';
import { logger } from '../logger';
import { createRouter } from './router';
import { errorHandler } from './middlewares/error-handler';

export function createApp(): Express {
  const app = express();
  const config = getConfig();

  app.locals.config = config;
  app.set('trust proxy', true);

  app.use((request, _response, next) => {
    logger.debug('Incoming request', {
      method: request.method,
      path: request.path,
      ip: request.ip,
    });
    next();
  });

  app.use(createRouter());
  app.use(errorHandler);

  return app;
}
