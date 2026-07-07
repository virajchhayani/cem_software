import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserSessionsService } from '../../users/user-sessions.service';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly userSessionsService: UserSessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtRefreshPayload) {
    const { sub: userId, sessionId, tokenId, type } = payload;
    const refreshToken = req.headers.authorization?.replace('Bearer ', '');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    if (type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify the refresh token exists and is valid
    const session = await this.userSessionsService.findByRefreshTokenHash(refreshToken);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.userId !== userId) {
      throw new UnauthorizedException('Token does not belong to user');
    }

    if (session.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      tokenId,
    };
  }
}
