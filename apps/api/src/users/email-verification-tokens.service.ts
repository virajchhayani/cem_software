import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailVerificationToken } from '@prisma/client';

@Injectable()
export class EmailVerificationTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EmailVerificationToken | null> {
    return this.prisma.emailVerificationToken.findUnique({
      where: { id },
    });
  }

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    return this.prisma.emailVerificationToken.findFirst({
      where: { token },
    });
  }

  async findByUserId(userId: string): Promise<EmailVerificationToken[]> {
    return this.prisma.emailVerificationToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailVerificationToken> {
    return this.prisma.emailVerificationToken.create({
      data,
    });
  }

  async markAsVerified(id: string): Promise<EmailVerificationToken> {
    const token = await this.findById(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.emailVerificationToken.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
  }

  async deleteUnusedByUserId(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        userId,
        verifiedAt: null,
      },
    });
  }

  async delete(id: string): Promise<EmailVerificationToken> {
    const token = await this.findById(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.emailVerificationToken.delete({
      where: { id },
    });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        verifiedAt: null,
      },
    });
  }
}
