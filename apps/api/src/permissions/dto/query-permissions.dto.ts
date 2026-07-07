import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PermissionType } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryPermissionsDto {
  @ApiProperty({ required: false, enum: PermissionType })
  @IsEnum(PermissionType)
  @IsOptional()
  type?: PermissionType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
