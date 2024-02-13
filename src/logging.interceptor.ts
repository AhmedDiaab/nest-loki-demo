import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, tap } from 'rxjs';
import { LokiLogger } from './logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {

    constructor(private readonly logger: LokiLogger) {
        this.logger.setContext(LoggingInterceptor.name);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const now = Date.now();
        const req = context.switchToHttp().getRequest() || '';
        const method = req.method;
        const url = req.url;
        const userAgent = req.get('user-agent') || '';

        return next.handle().pipe(
            tap((response) => {
                const res = context.switchToHttp().getResponse();
                const delay = Date.now() - now;
                const statusCode = res.statusCode;
                const contentLength = req.headers['content-length'] || '0';
                const ip = req.ip;
                const datetime = new Date(); // TODO: convert name to timestamp
                const protocol = req.protocol;
                const reqId = randomUUID();
                const message = {
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
                    response,
                    request: req.body || ''
                };
                this.logger.log(message);
            }));

    }
}