import { SetMetadata } from '@nestjs/common';

export const OWNER_KEY = 'owner';
export const Owner = () => SetMetadata(OWNER_KEY, true);
