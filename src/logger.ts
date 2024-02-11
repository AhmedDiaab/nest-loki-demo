import { LoggerService, ConsoleLogger, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as axios from 'axios';
import { createLogger, Logger } from 'winston';
import * as DRTransport from 'winston-daily-rotate-file';
import { ProcessLogsEvent } from "./logs.events";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { LOGS_QUEUE, LOGS_REDIS } from "./logs.token";

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

export type LogLevel = 'info' | 'error' | 'warn' | 'debug';

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


    constructor(private readonly emitter: EventEmitter2, @InjectQueue(LOGS_QUEUE) private readonly queue: Queue, context: string) {
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

    log(message: Record<string, any>) {
        this._options.console && super.log(message);
        this._appendToQueue(message, 'info');
    }

    error(message: Record<string, any>, trace: string) {
        this._options.console && super.error(message, trace);
        this._appendToQueue(message, 'error', trace);
    }

    warn(message: Record<string, any>) {
        this._options.console && super.warn(message);
        this._appendToQueue(message, 'warn');
    }

    debug(message: Record<string, any>) {
        this._options.console && super.debug(message);
        this._appendToQueue(message, 'debug');
    }

    /**
     * Adds job into redis queue with these logs
     */
    private _appendToQueue(message: Record<string, any>, level: LogLevel, trace?: string) {
        this.queue.add(LOGS_REDIS, { message, level, trace });
    }

    /**
     * Sends log to loki one by one
     */
    async logToLoki(message: Record<string, any>, level: LogLevel, trace?: string) {
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
            this._options.loki && await this.logToLoki(message, level, trace);
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