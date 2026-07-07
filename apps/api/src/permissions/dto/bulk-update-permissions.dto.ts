import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdatePermissionDto } from './update-permission.dto';

export class BulkUpdatePermissionsDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  updates: Array<{ id: string } & UpdatePermissionDto>;
}
