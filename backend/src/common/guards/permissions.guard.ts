import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions Guard
 * Checks if user has specific granular permissions (for RH role)
 * ADMIN always has all permissions
 * SUPER_ADMIN bypasses this check
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPER_ADMIN bypasses permission checks
    if (user.isSuperAdmin) {
      return true;
    }

    // ADMIN has all permissions within their service
    if (user.role === 'ADMIN') {
      return true;
    }

    // For RH role, check granular permissions
    if (user.role === 'RH') {
      const userPermissions: Permission[] = user.permissions || [];

      const hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied: You need one of these permissions: ${requiredPermissions.join(', ')}`,
        );
      }

      return true;
    }

    // EMPLOYE has no special permissions
    throw new ForbiddenException(
      'Access denied: Insufficient permissions for this action',
    );
  }
}
