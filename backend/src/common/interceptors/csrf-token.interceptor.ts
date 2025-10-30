import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * CSRF Token Interceptor
 *
 * Generates and sends CSRF tokens to the client
 * The token is sent in:
 * 1. Response header (X-CSRF-Token)
 * 2. Cookie (XSRF-TOKEN) for frontend to read
 */
@Injectable()
export class CsrfTokenInterceptor implements NestInterceptor {
  constructor(private configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();

    // Generate CSRF token if not already present
    let csrfToken = request.headers['x-csrf-token'] || request.cookies?.['XSRF-TOKEN'];

    if (!csrfToken) {
      csrfToken = this.generateCsrfToken();
    }

    // Set CSRF token in response header
    response.setHeader('X-CSRF-Token', csrfToken);

    // Set CSRF token in cookie (readable by JavaScript)
    // Using SameSite=Strict for CSRF protection
    response.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600000, // 1 hour
    });

    return next.handle();
  }

  /**
   * Generate a cryptographically secure CSRF token
   */
  private generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}
