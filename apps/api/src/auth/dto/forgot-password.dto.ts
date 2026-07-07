import { IsString, IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;
}
