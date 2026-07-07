import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttl: number;
}

export const Throttle = (limit: number, ttl: number) => {
  return SetMetadata(THROTTLE_KEY, { limit, ttl });
};
