import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

export enum Role {
  ADMIN = 'ADMIN',
  CHEF_SERVICE = 'CHEF_SERVICE',
  EMPLOYE = 'EMPLOYE',
  RH = 'RH',
  TECHNICIEN = 'TECHNICIEN',
  ADMINISTRATIF = 'ADMINISTRATIF',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Support both JWT format (user.role as string) and Keycloak format (user.roles as array)
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];

    if (!userRoles || userRoles.length === 0) {
      throw new ForbiddenException('User roles not found');
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `User requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}