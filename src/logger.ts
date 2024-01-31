import { LoggerService, ConsoleLogger, LogLevel } from "@nestjs/common";
import * as axios from 'axios';
import { createLogger, Logger } from 'winston';
import * as DRTransport from 'winston-daily-rotate-file';

export type LogOptions = {
    console: boolean;
    loki: boolean;
    fallbackToFile: boolean;
}

export type LokiLog = {
    streams: LokiStream[];
}

type LokiStream = {
    stream: LokiStreamInfo;
    values: Array<Array<string>>;
}

type LokiStreamInfo = {
    env: string;
    service: string;
}

export class LokiLogger extends ConsoleLogger implements LoggerService {

    private readonly _options: LogOptions = { console: true, loki: false, fallbackToFile: true };
    private readonly instance: axios.AxiosInstance;
    private readonly serviceName: string;
    private readonly logger: Logger;


    constructor(context: string, options?: Partial<LogOptions>) {
        super(context);
        this.serviceName = context;
        if (options) this._options = { ...this._options, ...options };

        // create logger
        this.logger = createLogger();

        if (this._options.fallbackToFile) {

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

            this.logger.add(fileTransport);
        }
        this.instance = axios.default.create({
            baseURL: "http://localhost:3100",
            headers: {
                "Content-Type": 'application/json'
            }
        });
    }

    async log(message: string) {
        this._options.console && super.log(message);
        await this._fallbackToFile(message, 'log');
    }

    async error(message: string, trace: string) {
        this._options.console && super.error(message, trace);
        await this._fallbackToFile(message, 'error');
    }

    async warn(message: string) {
        this._options.console && super.warn(message);
        await this._fallbackToFile(message, 'warn');
    }

    async debug(message: string) {
        this._options.console && super.debug(message);
        await this._fallbackToFile(message, 'debug');
    }

    private async _logToLoki(message: string, level: LogLevel) {
        const log: LokiLog = {
            streams: [{
                stream: { env: 'development', service: this.serviceName },
                values: [[(Date.now() * 1e6).toString(), message]]
            }]
        };
        try {
            await this.instance.post('/loki/api/v1/push', log)
        }
        catch (e) {
            console.error('Could not log to loki | ', `Level=${level}`);
            throw e;
        }
    }

    private async _fallbackToFile(message: string, level: LogLevel) {
        try {
            this._options.loki && await this._logToLoki(message, 'error');
        } catch (_) {
            this.logger.log('log', message);
        }
    }
}