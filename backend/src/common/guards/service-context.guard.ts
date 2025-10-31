import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Service Context Guard
 * Extracts serviceId from JWT token and adds it to request
 * This ensures all operations are scoped to the user's service (multi-tenant)
 */
@Injectable()
export class ServiceContextGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // SuperAdmin doesn't have a serviceId, they operate across all services
    if (user.isSuperAdmin) {
      return true;
    }

    // Regular employees must have a serviceId
    if (!user.serviceId) {
      throw new UnauthorizedException('User does not belong to any service');
    }

    // Add serviceId to request for easy access in controllers
    request.serviceId = user.serviceId;

    return true;
  }
}
