import { consumeRateLimit } from '@/lib/rate-limit';

export function takeOwnerSlot(ip: string, limit = 60, now = Date.now()) {
  return consumeRateLimit(`owner:${ip}`, limit, 60_000, now);
}
