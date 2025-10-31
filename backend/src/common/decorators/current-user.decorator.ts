import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract current user from request
 * Populated by JWT strategy
 *
 * @example
 * async getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 *
 * @example
 * async getMyLeaves(@CurrentUser('id') userId: string) {
 *   return this.leaveService.findByEmployee(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
