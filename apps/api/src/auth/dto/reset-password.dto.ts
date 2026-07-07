import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/^(?=.*\d)/, { message: 'Password must contain at least one number' })
  @Matches(/^(?=.*[@$!%*?&])/, { message: 'Password must contain at least one special character' })
  newPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  confirmPassword: string;
}
