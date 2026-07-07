import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryRolesDto {
  @ApiProperty({ required: false, enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

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
