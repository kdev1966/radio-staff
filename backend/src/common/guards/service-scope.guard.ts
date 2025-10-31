import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Service Scope Guard
 * Ensures tenant isolation - users can only access data from their own service
 * SUPER_ADMIN bypasses this check
 */
@Injectable()
export class ServiceScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPER_ADMIN can access all services
    if (user.isSuperAdmin) {
      return true;
    }

    // Ensure user has a serviceId
    if (!user.serviceId) {
      throw new ForbiddenException('User does not belong to any service');
    }

    // Extract serviceId from params, query, or body
    const targetServiceId =
      request.params?.serviceId ||
      request.query?.serviceId ||
      request.body?.serviceId;

    // If a serviceId is specified in the request, validate it matches user's service
    if (targetServiceId && targetServiceId !== user.serviceId) {
      throw new ForbiddenException(
        'Access denied: You can only access data from your own service',
      );
    }

    // Inject user's serviceId into request for automatic filtering
    request.scopedServiceId = user.serviceId;

    return true;
  }
}
