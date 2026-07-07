import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { GrantPermissionDto } from './grant-permission.dto';

export class BulkGrantPermissionsDto {
  @ApiProperty({ type: [GrantPermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrantPermissionDto)
  permissions: GrantPermissionDto[];
}
