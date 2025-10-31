import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only audit mutation operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const ipAddress = request.ip || request.connection.remoteAddress || 'Unknown';
    const userId = request.user?.id || null;
    const username = request.user?.username || 'anonymous';

    return next.handle().pipe(
      tap({
        next: async (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Extract entity information from the URL
          const urlParts = request.url.split('/').filter(Boolean);
          const entityType = this.extractEntityType(urlParts);
          const entityId = this.extractEntityId(urlParts, request.params);

          // Determine action based on method
          const action = this.getActionFromMethod(request.method);

          try {
            const auditLog = this.auditLogRepository.create({
              userId,
              username,
              action,
              entityType,
              entityId: entityId || undefined,
              method: request.method,
              endpoint: request.url,
              ipAddress,
              userAgent,
              statusCode,
              duration,
              requestBody: this.sanitizeBody(request.body),
              responseBody: statusCode < 400 ? this.sanitizeResponse(data) : undefined,
              timestamp: new Date(),
            });
            await this.auditLogRepository.save(auditLog);
          } catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw error to avoid breaking the main request
          }
        },
        error: async (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          const urlParts = request.url.split('/').filter(Boolean);
          const entityType = this.extractEntityType(urlParts);
          const entityId = this.extractEntityId(urlParts, request.params);
          const action = this.getActionFromMethod(request.method);

          try {
            const auditLog = this.auditLogRepository.create({
              userId,
              username,
              action,
              entityType,
              entityId: entityId || undefined,
              method: request.method,
              endpoint: request.url,
              ipAddress,
              userAgent,
              statusCode,
              duration,
              requestBody: this.sanitizeBody(request.body),
              errorMessage: error.message || 'Unknown error',
              timestamp: new Date(),
            });
            await this.auditLogRepository.save(auditLog);
          } catch (auditError) {
            console.error('Failed to create audit log for error:', auditError);
          }
        },
      }),
    );
  }

  private extractEntityType(urlParts: string[]): string {
    // Skip 'api' prefix if present
    const parts = urlParts[0] === 'api' ? urlParts.slice(1) : urlParts;

    if (parts.length === 0) return 'unknown';

    // Return the first meaningful segment (employees, shifts, leave, etc.)
    return parts[0].replace(/s$/, ''); // Remove trailing 's' for singular form
  }

  private extractEntityId(urlParts: string[], params: any): string | null {
    // Try to get ID from params first
    if (params?.id) {
      return params.id;
    }

    // Try to extract UUID or numeric ID from URL
    for (const part of urlParts) {
      // Check if it's a UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
        return part;
      }
      // Check if it's a numeric ID
      if (/^\d+$/.test(part)) {
        return part;
      }
    }

    return null;
  }

  private getActionFromMethod(method: string): any {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return method;
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;

    // Remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    // Limit size to avoid huge audit logs
    const stringified = JSON.stringify(sanitized);
    if (stringified.length > 5000) {
      return { message: 'Body too large, truncated', size: stringified.length };
    }

    return sanitized;
  }

  private sanitizeResponse(data: any): any {
    if (!data) return undefined;

    // Limit response size
    const stringified = JSON.stringify(data);
    if (stringified.length > 5000) {
      return { message: 'Response too large, truncated', size: stringified.length };
    }

    return data;
  }
}