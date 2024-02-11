import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { LokiLogger } from 'src/logger';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  constructor(private readonly lokiLogger: LokiLogger) {
    this.lokiLogger.setContext(ExceptionsFilter.name);
    this.lokiLogger.setOptions = { loki: true, console: true, fallbackToFile: true };
  }

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage: string;

    if (exception instanceof HttpException) {
      // If it's an HttpException, use the provided message
      errorMessage = exception.message;
    } else if (exception instanceof Error && exception.message) {
      // If it's a general Error, use its message
      errorMessage = exception.message;
    } else {
      // If there's no message, use a default one
      errorMessage = 'Internal server error';
    }
    const req = ctx.getRequest() || '';
    const reqId = randomUUID();
    const method = req.method;
    const url = req.url;
    const ip = req.ip;
    const userAgent = req.get('user-agent') || '';
    const datetime = new Date();
    const protocol = req.protocol;
    const res = ctx.getResponse();
    const statusCode = res.statusCode;
    const contentLength = req.headers['content-length'] || '0';
    const now = Date.now();
    const delay = Date.now() - now;

    const responseBody = {
      statusCode: status,
      message: errorMessage,
    };

    const log = {
      requestId: `[${reqId}]`,
      ip,
      datetime,
      method,
      url,
      userAgent,
      protocol,
      statusCode,
      contentLength,
      responseTime: `${delay}ms`,
      response: JSON.stringify(responseBody),
      request: req.body || ''

    }
    await this.lokiLogger.error(log, exception.stack);
    response.status(status).json(responseBody);
  }
}
