import { randomUUID } from "crypto";
import { Params } from "nestjs-pino";
import { stdSerializers, destination } from "pino";

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
        stream: destination({
            dest: `logs/logs.log`,
            minLength: 4096,
            sync: false
        })
    }
} 