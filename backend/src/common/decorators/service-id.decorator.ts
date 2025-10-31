import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Service ID Decorator
 * Extracts the serviceId from the request (set by ServiceContextGuard)
 *
 * Usage in controllers:
 * @Get('employees')
 * findAll(@ServiceId() serviceId: string) {
 *   return this.employeeService.findByService(serviceId);
 * }
 */
export const ServiceId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.serviceId;
  },
);
