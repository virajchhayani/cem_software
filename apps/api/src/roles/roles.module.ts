import { Module } from '@nestjs/common';
import { RolesService } from './services/roles.service';
import { RolesRepository } from './repositories/roles.repository';
import { RolesController } from './controllers/roles.controller';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}
