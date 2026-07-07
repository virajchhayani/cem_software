import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePermissionDto } from './create-permission.dto';

export class BulkCreatePermissionsDto {
  @ApiProperty({ type: [CreatePermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePermissionDto)
  permissions: CreatePermissionDto[];
}
