import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}
}
