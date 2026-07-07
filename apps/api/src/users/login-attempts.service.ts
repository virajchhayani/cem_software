import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoginAttempt, LoginStatus } from '@prisma/client';

@Injectable()
export class LoginAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    userId?: string;
    ipAddress?: string;
    browser?: string;
    deviceType?: any;
    status: LoginStatus;
    failureReason?: string;
  }): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.create({
      data,
    });
  }

  async findByEmail(email: string, limit: number = 10): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByUserId(userId: string, limit: number = 10): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByIpAddress(ipAddress: string, limit: number = 10): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findFailedAttemptsByEmail(email: string, minutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.loginAttempt.count({
      where: {
        email,
        status: LoginStatus.FAILURE,
        createdAt: { gte: since },
      },
    });
  }

  async findFailedAttemptsByIpAddress(ipAddress: string, minutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.loginAttempt.count({
      where: {
        ipAddress,
        status: LoginStatus.FAILURE,
        createdAt: { gte: since },
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }): Promise<{ attempts: LoginAttempt[]; total: number }> {
    const { skip = 0, take = 10, where, orderBy } = params || {};

    const [attempts, total] = await Promise.all([
      this.prisma.loginAttempt.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
      }),
      this.prisma.loginAttempt.count({ where }),
    ]);

    return { attempts, total };
  }

  async deleteOldAttempts(daysToKeep: number = 180): Promise<void> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    await this.prisma.loginAttempt.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
  }
}
