import { LoggerService, ConsoleLogger, Injectable } from "@nestjs/common";
import { createLogger, Logger } from 'winston';
import * as DRTransport from 'winston-daily-rotate-file';
import { Console } from "winston/lib/winston/transports";



export type LokiLog = {
    streams: LokiStream[];
}

type LokiStream = {
    stream: LokiStreamInfo;
    values: Array<Array<string>>;
}

type LokiStreamInfo = {
    env: string;
    service?: string;
}

export type LogLevel = 'info' | 'error' | 'warn' | 'debug';

@Injectable()
export class LokiLogger extends ConsoleLogger implements LoggerService {
    private readonly logger: Logger;
    constructor(context: string) {
        super(context);

        // create logger
        this.logger = createLogger();


        // create rotating file if loki is down
        const fileTransport = new DRTransport({
            eol: '\n',
            datePattern: 'YYYY-MM-DD',
            utc: true,
            createSymlink: true, // for creating link for current log file
            symlinkName: 'current.log',
            dirname: `./logs/`,
            filename: 'log-%DATE%.log',
        });
        // for logging into file
        this.logger.add(fileTransport);

        // for enabling console logging
        this.logger.add(new Console());

    }

    log(message: Record<string, any>) {
        this.logger.log('info', message);
    }

    error(message: Record<string, any>, trace: string) {
        this.logger.log('error', { ...message, trace });
    }

    warn(message: Record<string, any>) {
        this.logger.log('warn', message);
    }

    debug(message: Record<string, any>) {
        this.logger.log('debug', message);
    }
}