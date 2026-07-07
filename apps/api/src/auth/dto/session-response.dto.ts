import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Session ID' })
  id: string;

  @ApiProperty({ example: 'My Laptop', description: 'Device name' })
  deviceName: string;

  @ApiProperty({ example: 'DESKTOP', description: 'Device type' })
  deviceType: string;

  @ApiProperty({ example: 'Chrome', description: 'Browser name' })
  browser: string;

  @ApiProperty({ example: 'Windows', description: 'Operating system' })
  operatingSystem: string;

  @ApiProperty({ example: '192.168.1.1', description: 'IP address' })
  ipAddress: string;

  @ApiProperty({ example: 'US', description: 'Country code' })
  country?: string;

  @ApiProperty({ example: 'New York', description: 'City name' })
  city?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Login timestamp' })
  loginTime: Date;

  @ApiProperty({ example: '2024-01-15T11:30:00.000Z', description: 'Last activity timestamp' })
  lastActivity: Date;

  @ApiProperty({ example: true, description: 'Is this the current session?' })
  isCurrent: boolean;

  @ApiProperty({ example: 'ACTIVE', description: 'Session status' })
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';

  @ApiProperty({ example: '2024-01-22T10:30:00.000Z', description: 'Session expiration time' })
  expiresAt: Date;

  @ApiProperty({ example: 'Chrome on Windows', description: 'Human-readable device description' })
  deviceDescription: string;
}
