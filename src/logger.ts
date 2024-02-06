import { LoggerService, ConsoleLogger, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as axios from 'axios';
import { createLogger, Logger } from 'winston';
import * as DRTransport from 'winston-daily-rotate-file';
import { EVENT_EMITTER_TOKEN } from "./event-emitter.token";
import { ProcessLogsEvent } from "./logs.events";

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

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

export class LokiLogger extends ConsoleLogger implements LoggerService {

    private readonly _options: LogOptions = { console: true, loki: false, fallbackToFile: true };
    private readonly instance: axios.AxiosInstance;
    private readonly serviceName: string;
    private readonly logger: Logger;
    private firedEvent: boolean = false;


    constructor(context: string, options?: Partial<LogOptions>, @Inject(EVENT_EMITTER_TOKEN) private emitter?: EventEmitter2) {
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

    async log(message: Record<string, any>) {
        this._options.console && super.log(message);
        await this._fallbackToFile(message, 'info');
    }

    async error(message: Record<string, any>, trace: string) {
        this._options.console && super.error(message, trace);
        await this._fallbackToFile(message, 'error', trace);
    }

    async warn(message: Record<string, any>) {
        this._options.console && super.warn(message);
        await this._fallbackToFile(message, 'warn');
    }

    async debug(message: Record<string, any>) {
        this._options.console && super.debug(message);
        await this._fallbackToFile(message, 'debug');
    }

    private async _logToLoki(message: Record<string, any>, level: LogLevel, trace?: string) {
        if (trace) message.trace = trace;
        message.level = level;
        console.log(message)
        const log: LokiLog = {
            streams: [{
                stream: { env: 'development', service: this.serviceName },
                values: [[(Date.now() * 1e6).toString(), JSON.stringify(message)]]
            }]
        };
        try {
            await this.instance.post('/loki/api/v1/push', log);
            // TODO: migrate files (if exist) to loki through background jobs
        }
        catch (e) {
            // console.error('Could not log to loki | ', `Level=${level}`);
            throw e;
        }
    }

    private async _fallbackToFile(message: Record<string, any>, level: LogLevel, trace?: string) {
        try {
            this._options.loki && await this._logToLoki(message, level, trace);
            !this.firedEvent && this.emitter.emit(ProcessLogsEvent) && (this.firedEvent = true);
        } catch (_) {
            this.logger.log(level, message);
            this.firedEvent && (this.firedEvent = false);
        }
    }
}