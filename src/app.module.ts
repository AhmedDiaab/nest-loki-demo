import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingInterceptor } from './logging.interceptor';
import { HttpModule } from '@nestjs/axios';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LogsListener } from './logs.listener';
import { join } from 'path';
import { LokiLogger } from './logger';
import { ExceptionsFilter } from './exceptions/exceptions.filter';
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { LOGS_QUEUE } from './logs.token';
import { LogsProcessor } from './logs.processor';

@Module({
  imports: [
    HttpModule,
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: LOGS_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
      }
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter // Or FastifyAdapter from `@bull-board/fastify`
    }),
    BullBoardModule.forFeature({
      name: LOGS_QUEUE,
      adapter: BullAdapter
    }),
    EventEmitterModule.forRoot({
      global: true,
      verboseMemoryLeak: true

    })
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ExceptionsFilter
    },
    LokiLogger,
    LogsListener,
    LogsProcessor
  ],
})
export class AppModule { }
