import { randomUUID } from "crypto";
import { Params } from "nestjs-pino";
import { stdSerializers } from "pino";

export const PinoConfig: Params = {
    pinoHttp: {
        genReqId: function (req, res) {
            const existingID = req.id ?? req.headers["x-request-id"];
            if (existingID) return existingID;
            const id = randomUUID();
            res.setHeader('X-Request-Id', id);
            return id;
        },
        serializers: {
            err: stdSerializers.err,
            req: stdSerializers.req,
            res: stdSerializers.res,
        },
        redact: [], // sanitize here
        customLogLevel: function (req, res, err) {
            if (res.statusCode >= 400 && res.statusCode < 500) {
                return 'warn'
            } else if (res.statusCode >= 500 || err) {
                return 'error'
            } else if (res.statusCode >= 300 && res.statusCode < 400) {
                return 'silent'
            }
            return 'info'
        },
    }
} 