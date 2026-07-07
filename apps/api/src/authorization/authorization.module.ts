import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthorizationService } from './services/authorization.service';
import { AuthorizationGuard } from './guards/authorization.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { OwnerGuard } from './guards/owner.guard';
import { AuthorizationController } from './controllers/authorization.controller';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    RolesModule,
    PermissionsModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 300,
    }),
  ],
  controllers: [AuthorizationController],
  providers: [
    AuthorizationService,
    AuthorizationGuard,
    RolesGuard,
    PermissionsGuard,
    OwnerGuard,
  ],
  exports: [
    AuthorizationService,
    AuthorizationGuard,
    RolesGuard,
    PermissionsGuard,
    OwnerGuard,
  ],
})
export class AuthorizationModule {}
