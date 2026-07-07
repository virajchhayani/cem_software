import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CheckPermissionsDto {
  @ApiProperty({ description: 'Array of permission codes to check', type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({ description: 'Whether user must have all permissions', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  requireAll?: boolean;
}
