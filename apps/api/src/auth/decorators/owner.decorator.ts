import { SetMetadata } from '@nestjs/common';

export const OWNER_KEY = 'owner';

export interface OwnerCheck {
  paramName: string; // The parameter name that contains the user ID (e.g., 'userId', 'id')
}

export const Owner = (paramName: string = 'userId') => {
  return SetMetadata(OWNER_KEY, { paramName });
};
