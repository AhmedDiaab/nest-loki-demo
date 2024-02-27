import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, catchError, tap } from 'rxjs';
import { LokiLogger } from './logger';
import { LogEntryDto } from './log-entry.dto';

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
            tap(
                (response) => {
                    const res = context.switchToHttp().getResponse();
                    const delay = Date.now() - now;
                    const statusCode = res.statusCode;
                    const contentLength = req.headers['content-length'] || '0';
                    const ip = req.ip;
                    const timestamp = new Date(); // TODO: convert name to timestamp
                    const protocol = req.protocol;
                    const reqId = randomUUID();
                    const message: LogEntryDto = {
                        requestId: `[${reqId}]`,
                        ip,
                        timestamp,
                        method,
                        url,
                        userAgent,
                        protocol,
                        statusCode,
                        contentLength,
                        responseTime: delay,
                        response,
                        request: req.body || ''
                    };
                    this.logger.log(message);
                })
        );

    }
}