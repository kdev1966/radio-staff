import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * CSRF Protection Guard
 *
 * Protects against Cross-Site Request Forgery attacks by validating:
 * 1. Origin/Referer headers match allowed origins
 * 2. Custom X-CSRF-Token header is present for state-changing operations
 *
 * Can be bypassed for specific endpoints using @SkipCsrfProtection() decorator
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly allowedOrigins: string[];
  private readonly stateMutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {
    const originsString = this.configService.get<string>('ALLOWED_ORIGINS', 'http://localhost:3000');
    this.allowedOrigins = originsString.split(',').map(origin => origin.trim());
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if CSRF protection is skipped for this route
    const skipCsrf = this.reflector.get<boolean>('skipCsrf', context.getHandler());
    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // CSRF protection only applies to state-changing methods
    if (!this.stateMutatingMethods.includes(method)) {
      return true;
    }

    // Validate Origin/Referer
    if (!this.validateOrigin(request)) {
      this.logger.warn(`CSRF: Invalid origin/referer for ${method} ${request.url}`);
      throw new ForbiddenException('Invalid origin or referer');
    }

    // For API endpoints, check for custom header (Double Submit Cookie pattern)
    if (!this.validateCsrfToken(request)) {
      this.logger.warn(`CSRF: Missing or invalid CSRF token for ${method} ${request.url}`);
      throw new ForbiddenException('CSRF token validation failed');
    }

    return true;
  }

  /**
   * Validate that the request comes from an allowed origin
   */
  private validateOrigin(request: Request): boolean {
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // Check origin header (preferred)
    if (origin) {
      return this.allowedOrigins.some(allowed =>
        origin === allowed || origin.startsWith(allowed)
      );
    }

    // Fallback to referer if origin is not present
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
        return this.allowedOrigins.some(allowed =>
          refererOrigin === allowed || refererOrigin.startsWith(allowed)
        );
      } catch (error) {
        this.logger.error(`Invalid referer URL: ${referer}`);
        return false;
      }
    }

    // If both are missing, reject the request
    return false;
  }

  /**
   * Validate CSRF token using custom header approach
   * This works better with JWT-based APIs than traditional session-based CSRF
   */
  private validateCsrfToken(request: Request): boolean {
    // Check for custom header (modern approach for SPAs)
    const csrfHeader = request.headers['x-csrf-token'] || request.headers['x-xsrf-token'];

    if (!csrfHeader || typeof csrfHeader !== 'string') {
      return false;
    }

    // In a real implementation, you might want to validate the token value
    // For now, we just check that it's present and non-empty
    // The presence of a custom header is sufficient for CSRF protection
    // because browsers don't allow arbitrary headers in simple CORS requests
    return csrfHeader.length > 0;
  }
}
