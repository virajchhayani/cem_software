import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GrantPermissionDto {
  @ApiProperty({ description: 'Permission ID to grant' })
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({ description: 'Optional expiration date for the permission', required: false })
  @IsOptional()
  expiresAt?: Date;
}
