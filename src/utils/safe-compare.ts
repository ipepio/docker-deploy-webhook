import { createHash, timingSafeEqual } from 'crypto';

function hashValue(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function safeCompare(left: string, right: string): boolean {
  return timingSafeEqual(hashValue(left), hashValue(right));
}
