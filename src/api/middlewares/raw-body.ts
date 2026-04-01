import express, { type NextFunction, type Request, type Response } from 'express';

import { HttpError } from '../../errors/http-error';

export const rawDeployBodyMiddleware = express.raw({
  type: 'application/json',
  limit: '1mb',
});

export function parseRawDeployJsonMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const rawRequest = request as Request & { rawBody?: Buffer };

  if (!Buffer.isBuffer(rawRequest.body)) {
    next(new HttpError(400, 'invalid_json', 'Expected raw JSON body'));
    return;
  }

  rawRequest.rawBody = Buffer.from(rawRequest.body);

  try {
    rawRequest.body = JSON.parse(rawRequest.rawBody.toString('utf8')) as unknown;
    next();
  } catch {
    next(new HttpError(400, 'invalid_json', 'Malformed JSON body'));
  }
}
