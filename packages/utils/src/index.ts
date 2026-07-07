// Utils Package
// This package contains shared utility functions for the CEM ERP system
// Utilities will be added in future phases

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
