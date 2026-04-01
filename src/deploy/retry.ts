import { TimeoutError } from './errors';
import { sleep } from '../utils/sleep';

const TRANSIENT_ERROR_PATTERNS = [
  /network/i,
  /timeout/i,
  /temporarily unavailable/i,
  /connection reset/i,
  /i\/o timeout/i,
];

export function isTransientError(error: unknown): boolean {
  if (error instanceof TimeoutError) {
    return true;
  }

  const text = String(error);
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retryAttempts: number; retryBackoffMs: number },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retryAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isTransientError(error) || attempt === options.retryAttempts) {
        throw error;
      }

      await sleep(options.retryBackoffMs * (attempt + 1));
    }
  }

  throw lastError;
}
