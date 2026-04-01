import { type NextFunction, type Request, type Response } from 'express';

import { getConfig } from '../config';
import { HttpError } from '../errors/http-error';
import { safeCompare } from '../utils/safe-compare';

function extractBearerToken(request: Request): string {
  const authorization = request.header('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new HttpError(401, 'unauthorized', 'Missing bearer token');
  }

  return authorization.slice('Bearer '.length).trim();
}

export function requireAdminRead(request: Request, _response: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(request);
    const { adminReadToken, adminWriteToken } = getConfig().server.security;

    if (!safeCompare(token, adminReadToken) && !safeCompare(token, adminWriteToken)) {
      throw new HttpError(401, 'unauthorized', 'Invalid admin token');
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdminWrite(request: Request, _response: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(request);
    const { adminWriteToken } = getConfig().server.security;

    if (!safeCompare(token, adminWriteToken)) {
      throw new HttpError(401, 'unauthorized', 'Invalid admin token');
    }

    next();
  } catch (error) {
    next(error);
  }
}
