import { LoggerService, ConsoleLogger, LogLevel } from "@nestjs/common";
import * as axios from 'axios';

export type LogOptions = {
    console: boolean;
    loki: boolean;
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

    private readonly _options: LogOptions = { console: true, loki: false };
    private readonly instance: axios.AxiosInstance;
    private readonly serviceName: string;


    constructor(context: string, options?: Partial<LogOptions>) {
        super(context);
        this.serviceName = context;
        if (options) this._options = { ...this._options, ...options };
        this.instance = axios.default.create({
            baseURL: "http://localhost:3100",
            headers: {
                "Content-Type": 'application/json'
            }
        });
    }

    async log(message: string) {
        this._options.console && super.log(message);
        this._options.loki && await this._logToLoki(message, 'log');
    }

    async error(message: string, trace: string) {
        this._options.console && super.error(message, trace);
        this._options.loki && await this._logToLoki(message, 'error');
    }

    async warn(message: string) {
        this._options.console && super.warn(message);
        this._options.loki && await this._logToLoki(message, 'error');

    }

    async debug(message: string) {
        this._options.console && super.debug(message);
        this._options.loki && await this._logToLoki(message, 'error');
    }

    async verbose(message: string) {
        this._options.console && super.verbose(message);
        this._options.loki && await this._logToLoki(message, 'error');
    }

    private async _logToLoki(message: string, level: LogLevel) {
        const log: LokiLog = {
            streams: [{
                stream: { env: 'development', service: this.serviceName },
                values: [[(Date.now() * 1e6).toString(), message]]
            }]
        };

        const _log = {
            stream: { env: 'development', service: this.serviceName },
            values: [(Date.now() * 1e6).toString(), message]
        };
        try {
            await this.instance.post('/loki/api/v1/push', log)
        }
        catch (e) {
            console.error('Could not log to loki | ', `Level=${level}`);
            console.log(e)
        }

    }
}