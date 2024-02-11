import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { LOGS_QUEUE, LOGS_REDIS } from './logs.token';
import { LogLevel, LokiLogger } from './logger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkRetrialFlag, ProcessLogsEvent, RetryFailedLogsEvent } from './logs.events';

@Processor(LOGS_QUEUE)
export class LogsProcessor {

  constructor(private readonly logger: LokiLogger, private readonly emitter: EventEmitter2) {

  }

  @Process('log')
  async log(job: Job<{ lines: string[] }>) {
    let logs: Record<string, any>[];
    try {
      logs = job.data.lines.filter(line => line.length !== 0).map(line => {
        if (line.length === 0) return;
        return JSON.parse(line);
      });
      await this.logger.shipLogsToLoki(logs);
    } catch (e) {
      console.log(e)
      throw e;
    }
    this.emitter.emit(ProcessLogsEvent); // emit event to restart this cycle
    return { logs }
  }

  @Process(LOGS_REDIS)
  async processLogs(job: Job<{ message: Record<string, any>, level: LogLevel, trace?: string }>) {
    try {
      const log = job.data;
      await this.logger.logToLoki(log.message, log.level, log.trace);
      // retry failed jobs
      this.emitter.emit(RetryFailedLogsEvent)
    } catch (e) {
      this.emitter.emit(MarkRetrialFlag)
      throw e;
    }
  }


}
