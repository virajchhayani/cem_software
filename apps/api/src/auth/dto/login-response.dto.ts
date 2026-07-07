import { ApiProperty } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (15 minutes expiry)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (7 days expiry)',
  })
  refreshToken: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiry in seconds (15 minutes)',
  })
  expiresIn: number;
}

export class UserDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID',
  })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  lastName: string;

  @ApiProperty({
    example: 'ADMIN',
    description: 'User role',
    enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'],
  })
  role: string;

  @ApiProperty({
    example: ['users.read', 'users.write', 'projects.read'],
    description: 'User permissions',
    required: false,
  })
  permissions?: string[];
}

export class LoginResponseDto {
  @ApiProperty({
    type: UserDto,
    description: 'User information',
  })
  user: UserDto;

  @ApiProperty({
    type: TokensDto,
    description: 'Authentication tokens',
  })
  tokens: TokensDto;
}
