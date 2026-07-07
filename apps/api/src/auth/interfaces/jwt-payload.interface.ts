export interface JwtPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: string;          // User role
  sessionId: string;     // Session ID
  iat?: number;          // Issued at
  exp?: number;          // Expiration
}

export interface JwtRefreshPayload {
  sub: string;           // User ID
  sessionId: string;     // Session ID
  tokenId: string;       // Token ID for rotation
  type: 'refresh';       // Token type
  email: string;         // User email
  role: string;          // User role
  iat?: number;
  exp?: number;
}
