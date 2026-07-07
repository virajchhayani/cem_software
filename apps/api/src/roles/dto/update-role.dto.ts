import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';
import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiProperty({ enum: UserRole, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  permissionId?: string;
}
