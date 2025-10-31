import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role Enum - Simplified for multi-tenant architecture
 */
export enum Role {
  ADMIN = 'ADMIN',        // Chef de service (1 per service)
  RH = 'RH',             // Ressources Humaines (with configurable permissions)
  EMPLOYE = 'EMPLOYE',   // Employee (TECHNICIEN or ADMINISTRATIF)
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

    // SUPER_ADMIN bypasses role checks (has access to everything)
    if (user.isSuperAdmin) {
      return true;
    }

    // Check user role
    if (!user.role) {
      throw new ForbiddenException('User role not found');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: You need one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}