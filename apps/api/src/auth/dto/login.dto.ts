import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd123',
    description: 'User password',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @ApiProperty({
    example: 'My Laptop',
    description: 'Device name for session tracking',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({
    example: 'DESKTOP',
    description: 'Device type (DESKTOP, MOBILE, TABLET)',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiProperty({
    example: 'Chrome',
    description: 'Browser name',
    required: false,
  })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiProperty({
    example: 'Windows',
    description: 'Operating system',
    required: false,
  })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiProperty({
    example: '192.168.1.1',
    description: 'IP address',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    example: 'US',
    description: 'Country code',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'New York',
    description: 'City name',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;
}
