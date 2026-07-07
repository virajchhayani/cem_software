export const cookieConfig = {
  // Access token cookie configuration
  accessToken: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  // Refresh token cookie configuration
  refreshToken: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/auth/refresh',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  // Session cookie configuration
  session: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
};

export const getCookieOptions = (type: 'accessToken' | 'refreshToken' | 'session') => {
  return cookieConfig[type];
};
