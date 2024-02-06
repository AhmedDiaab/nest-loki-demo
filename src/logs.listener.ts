import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProcessLogsEvent } from './logs.events';

@Injectable()
export class LogsListner {
    constructor() {}

    @OnEvent(ProcessLogsEvent)
    processLogs(payload: any) {
        
    }
    
}