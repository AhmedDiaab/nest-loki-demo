import { OnEventType } from '@nestjs/event-emitter';

export const ProcessLogsEvent: OnEventType = 'logs.process';

export const RetryFailedLogsEvent: OnEventType = 'logs.retry';

export const MarkRetrialFlag: OnEventType = 'logs.markRetrial';