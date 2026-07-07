import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PasswordResetToken } from '@prisma/client';

@Injectable()
export class PasswordResetTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findUnique({
      where: { id },
    });
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: { token },
    });
  }

  async findByUserId(userId: string): Promise<PasswordResetToken[]> {
    return this.prisma.passwordResetToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({
      data,
    });
  }

  async markAsUsed(id: string): Promise<PasswordResetToken> {
    const token = await this.findById(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteUnusedByUserId(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });
  }

  async delete(id: string): Promise<PasswordResetToken> {
    const token = await this.findById(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.passwordResetToken.delete({
      where: { id },
    });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        usedAt: null,
      },
    });
  }
}
