import { Module, Global } from '@nestjs/common';
import { KeycloakService } from './keycloak.service';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [KeycloakService, KeycloakAuthGuard],
  exports: [KeycloakService, KeycloakAuthGuard],
})
export class KeycloakModule {}