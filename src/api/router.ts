import express, { Router } from 'express';

import { requireAdminRead, requireAdminWrite } from '../auth/admin.auth';
import {
  adminDeployController,
  adminRedeployLastSuccessfulController,
  adminRetryJobController,
} from './controllers/admin.controller';
import { deployController } from './controllers/deploy.controller';
import { healthController } from './controllers/health.controller';
import { getJobController, getRecentDeploymentsController } from './controllers/jobs.controller';
import { adminRateLimiter, webhookRateLimiter } from './middlewares/rate-limiter';
import { parseRawDeployJsonMiddleware, rawDeployBodyMiddleware } from './middlewares/raw-body';

export function createRouter(): Router {
  const router = Router();
  const jsonBodyParser = express.json({ limit: '1mb' });

  router.post(
    '/deploy',
    webhookRateLimiter,
    rawDeployBodyMiddleware,
    parseRawDeployJsonMiddleware,
    deployController,
  );

  router.get('/health', healthController);
  router.get('/jobs/:id', adminRateLimiter, requireAdminRead, getJobController);
  router.get(
    '/deployments/recent',
    adminRateLimiter,
    requireAdminRead,
    getRecentDeploymentsController,
  );
  router.post(
    '/admin/deploy',
    adminRateLimiter,
    requireAdminWrite,
    jsonBodyParser,
    adminDeployController,
  );
  router.post(
    '/admin/deploy/redeploy-last-successful',
    adminRateLimiter,
    requireAdminWrite,
    jsonBodyParser,
    adminRedeployLastSuccessfulController,
  );
  router.post(
    '/admin/jobs/:id/retry',
    adminRateLimiter,
    requireAdminWrite,
    jsonBodyParser,
    adminRetryJobController,
  );

  return router;
}
