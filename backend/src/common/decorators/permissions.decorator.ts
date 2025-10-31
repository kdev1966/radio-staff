import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';
import { PERMISSIONS_KEY } from '../guards/permissions.guard';

/**
 * Decorator to specify required permissions for a route
 * Used with PermissionsGuard
 *
 * @example
 * @RequirePermissions(Permission.MANAGE_EMPLOYEES)
 * async createEmployee() { ... }
 *
 * @example
 * @RequirePermissions(Permission.MANAGE_LEAVES, Permission.APPROVE_LEAVES)
 * async approveLeave() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
