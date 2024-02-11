import { LoggerService, ConsoleLogger, Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as axios from 'axios';
import { createLogger, Logger } from 'winston';
import * as DRTransport from 'winston-daily-rotate-file';
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
    service?: string;
}

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

@Injectable()
export class LokiLogger extends ConsoleLogger implements LoggerService {

    private _options: LogOptions = { console: true, loki: false, fallbackToFile: true };
    private readonly instance: axios.AxiosInstance;
    private readonly serviceName: string;
    private readonly logger: Logger;
    private firedEvent: boolean = false;

    set setOptions(options: Partial<LogOptions>) {
        this._options = { ...this._options, ...options };
    }


    constructor(private readonly emitter: EventEmitter2, context: string) {
        super(context);
        this.serviceName = context;

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

    /**
     * Sends log to loki one by one
     */
    private async _logToLoki(message: Record<string, any>, level: LogLevel, trace?: string) {
        if (trace) message.trace = trace;
        message.level = level;
        const log: LokiLog = {
            streams: [{
                stream: this.serviceName ? { env: 'development', service: this.serviceName } : { env: 'development' },
                values: [[this._timestampToNanoSeconds(Date.now()), JSON.stringify(message)]]
            }]
        };
        try {
            await this.instance.post('/loki/api/v1/push', log);
        }
        catch (e) {
            // console.error('Could not log to loki | ', `Level=${level}`);
            throw e;
        }
    }


    /**
     * Ships bulk of logs to loki at once
     * Used in queue consumer
     */
    async shipLogsToLoki(messages: Record<string, any>[]) {
        const logs: LokiLog = {
            streams: [{
                stream: this.serviceName ? { env: 'development', service: this.serviceName } : { env: 'development' },
                values: messages.map(message => [this._timestampToNanoSeconds(message['datetime']), JSON.stringify(message)])  // TODO: change datetime to timestamp
            }]
        };

        try {
            await this.instance.post('/loki/api/v1/push', logs);
        }
        catch (e) {
            // console.error('Could not log to loki | ', `Level=${level}`);
            throw e;
        }
    }

    private async _fallbackToFile(message: Record<string, any>, level: LogLevel, trace?: string) {
        try {
            this._options.loki && await this._logToLoki(message, level, trace);
            !this.firedEvent && this.emitter.emit(ProcessLogsEvent);
            if (this.firedEvent === false) this.firedEvent = true; // TODO: uncomment this code
        } catch (_) {
            this.logger.log(level, message);
            if (this.firedEvent) this.firedEvent = false;
        }
    }

    /**
     * Converts Date.now() or any date in form of ms to nanoseconds in string format
     */
    private _timestampToNanoSeconds(now: number) {
        if (!now) now = (new Date()).getTime(); // handle if no date then get the date of now
        return (new Date(now).getTime() * 1e6).toString();
    }
}