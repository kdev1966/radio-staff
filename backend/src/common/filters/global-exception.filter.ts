import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
  method: string;
  details?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || error;
        details = responseObj.details;
      }
    } else if (this.isPrismaError(exception)) {
      const prismaError = this.handlePrismaError(exception as PrismaClientKnownRequestError);
      statusCode = prismaError.statusCode;
      message = prismaError.message;
      error = prismaError.error;
      details = !this.isProduction ? prismaError.details : undefined;
    } else if (exception instanceof Error) {
      message = this.isProduction ? 'An error occurred' : exception.message;
      error = exception.name || 'Error';

      if (!this.isProduction) {
        details = {
          stack: exception.stack,
        };
      }
    }

    // Log the error with context
    this.logError(exception, request, statusCode);

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Add details in non-production environments
    if (!this.isProduction && details) {
      errorResponse.details = details;
    }

    response.status(statusCode).json(errorResponse);
  }

  private isPrismaError(exception: unknown): boolean {
    return exception instanceof PrismaClientKnownRequestError ||
           exception instanceof PrismaClientUnknownRequestError ||
           exception instanceof PrismaClientRustPanicError ||
           exception instanceof PrismaClientInitializationError ||
           exception instanceof PrismaClientValidationError;
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
    details?: any;
  } {
    let statusCode = HttpStatus.BAD_REQUEST;
    let message = 'Database operation failed';
    let errorName = 'Database Error';
    const details: any = {};

    switch (error.code) {
      case 'P2000':
        message = 'The provided value for the column is too long';
        break;
      case 'P2002':
        message = 'Unique constraint violation';
        errorName = 'Duplicate Entry';
        statusCode = HttpStatus.CONFLICT;
        if (error.meta?.target) {
          const fields = (error.meta.target as string[]).join(', ');
          message = `Duplicate value for field(s): ${fields}`;
          details.fields = error.meta.target;
        }
        break;
      case 'P2003':
        message = 'Foreign key constraint violation';
        errorName = 'Invalid Reference';
        if (error.meta?.field_name) {
          message = `Invalid reference for field: ${error.meta.field_name}`;
          details.field = error.meta.field_name;
        }
        break;
      case 'P2025':
        message = 'Record not found';
        errorName = 'Not Found';
        statusCode = HttpStatus.NOT_FOUND;
        break;
      case 'P2014':
        message = 'The change would violate a required relation';
        errorName = 'Relation Violation';
        break;
      case 'P2016':
        message = 'Query interpretation error';
        break;
      case 'P2017':
        message = 'The records for the relation are not connected';
        errorName = 'Relation Not Connected';
        break;
      case 'P2018':
        message = 'Required connected records were not found';
        errorName = 'Missing Required Relation';
        break;
      case 'P2019':
        message = 'Input error';
        if (error.meta?.details) {
          message = `Input error: ${error.meta.details}`;
        }
        break;
      case 'P2020':
        message = 'Value out of range';
        errorName = 'Out of Range';
        break;
      case 'P2021':
        message = 'Table does not exist';
        errorName = 'Table Not Found';
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        break;
      case 'P2022':
        message = 'Column does not exist';
        errorName = 'Column Not Found';
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        break;
      case 'P2023':
        message = 'Inconsistent column data';
        errorName = 'Data Inconsistency';
        break;
      case 'P2024':
        message = 'Timed out fetching a connection from the pool';
        errorName = 'Connection Timeout';
        statusCode = HttpStatus.SERVICE_UNAVAILABLE;
        break;
      case 'P2027':
        message = 'Multiple errors occurred during database operation';
        errorName = 'Multiple Database Errors';
        break;
      default:
        message = `Database error: ${error.code}`;
        if (error.meta) {
          details.meta = error.meta;
        }
    }

    return {
      statusCode,
      message,
      error: errorName,
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  }

  private logError(exception: unknown, request: Request, statusCode: number): void {
    const user = (request as any).user;
    const logContext = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      statusCode,
      userId: user?.id || 'anonymous',
      username: user?.username || 'anonymous',
      ip: request.ip || request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
    };

    if (statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
        logContext,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        exception instanceof Error ? exception.message : 'Client error',
        logContext,
      );
    } else {
      this.logger.debug(
        exception instanceof Error ? exception.message : 'Request processed',
        logContext,
      );
    }
  }
}