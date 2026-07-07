import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
