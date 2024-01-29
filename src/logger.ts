import { LoggerService, ConsoleLogger, LogLevel } from "@nestjs/common";
import * as axios from 'axios';


export class LokiLogger extends ConsoleLogger implements LoggerService {

    private _lokiEnabled: boolean;
    private readonly instance: axios.AxiosInstance;
    private readonly serviceName: string;


    constructor(context: string) {
        super(context);
        this.serviceName = context;
        this._lokiEnabled = false;
        this.instance = axios.default.create({
            url: "http://localhost:3100",
            headers: {
                "Content-Type": 'application/json'
            }
        });
    }

    set enableLoki(value: boolean) {
        this._lokiEnabled = value;
    }


    async log(message: string) {
        super.log(message);
        if (this._lokiEnabled) await this._logToLoki(message, 'log');
    }

    async error(message: string, trace: string) {
        super.error(message, trace);
        if (this._lokiEnabled) await this._logToLoki(message, 'error');
    }

    async warn(message: string) {
        super.warn(message);
        if (this._lokiEnabled) await this._logToLoki(message, 'error');

    }

    async debug(message: string) {
        super.debug(message);
        if (this._lokiEnabled) await this._logToLoki(message, 'error');
    }

    async verbose(message: string) {
        super.verbose(message);
        if (this._lokiEnabled) await this._logToLoki(message, 'error');
    }

    private async _logToLoki(message: string, level: LogLevel) {
        const log = {
            stream: { env: 'development', service: this.serviceName },
            values: [(Date.now() * 1e6).toString(), message]
        };
        try {
            await this.instance.post('/loki/api/v1/push', log)
        }
        catch (e) {
            this.error('Could not log to loki', `Level=${level}`);
        }

    }
}