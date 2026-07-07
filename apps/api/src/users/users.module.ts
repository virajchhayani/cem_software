import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserSessionsService } from './user-sessions.service';
import { LoginAttemptsService } from './login-attempts.service';
import { EmailVerificationTokensService } from './email-verification-tokens.service';
import { PasswordResetTokensService } from './password-reset-tokens.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    UsersService,
    UserSessionsService,
    LoginAttemptsService,
    EmailVerificationTokensService,
    PasswordResetTokensService,
  ],
  exports: [
    UsersService,
    UserSessionsService,
    LoginAttemptsService,
    EmailVerificationTokensService,
    PasswordResetTokensService,
  ],
})
export class UsersModule {}
