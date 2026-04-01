import { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

import { ConfigError } from '../../config/errors';
import { HttpError } from '../../errors/http-error';
import { logger } from '../../logger';

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.code,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'invalid_request',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof ConfigError) {
    logger.error('Configuration error during request handling', {
      error: error.message,
      context: error.context,
    });
    response.status(500).json({
      error: 'internal_error',
    });
    return;
  }

  logger.error('Unhandled request error', {
    error: String(error),
  });
  response.status(500).json({
    error: 'internal_error',
  });
}
