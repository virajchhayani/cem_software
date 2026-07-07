import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserSession, SessionStatus } from '@prisma/client';

@Injectable()
export class UserSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({
      where: { id },
    });
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<UserSession | null> {
    return this.prisma.userSession.findFirst({
      where: { refreshTokenHash },
    });
  }

  async findByUserId(userId: string): Promise<UserSession[]> {
    return this.prisma.userSession.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByUserId(userId: string): Promise<UserSession[]> {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    userId: string;
    deviceName?: string;
    deviceType?: any;
    browser?: string;
    operatingSystem?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
    userAgent?: string;
    refreshTokenHash: string;
    isCurrent?: boolean;
    expiresAt: Date;
  }): Promise<UserSession> {
    return this.prisma.userSession.create({
      data,
    });
  }

  async update(id: string, data: Partial<UserSession>): Promise<UserSession> {
    const session = await this.findById(id);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.userSession.update({
      where: { id },
      data,
    });
  }

  async revoke(id: string): Promise<UserSession> {
    return this.update(id, {
      isRevoked: true,
      status: SessionStatus.REVOKED,
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        deletedAt: null,
      },
      data: {
        isRevoked: true,
        status: SessionStatus.REVOKED,
      },
    });
  }

  async markOthersAsNotCurrent(userId: string, currentSessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        deletedAt: null,
      },
      data: {
        isCurrent: false,
      },
    });
  }

  async markAsCurrent(id: string): Promise<UserSession> {
    return this.update(id, { isCurrent: true });
  }

  async updateLastActivity(id: string): Promise<UserSession> {
    return this.update(id, { lastActivity: new Date() });
  }

  async delete(id: string): Promise<UserSession> {
    const session = await this.findById(id);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.userSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: SessionStatus.ACTIVE,
      },
      data: {
        status: SessionStatus.EXPIRED,
        isRevoked: true,
      },
    });
  }
}
