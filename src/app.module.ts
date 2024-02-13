import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER } from '@nestjs/core';
import { LokiLogger } from './logger';
import { ExceptionsFilter } from './exceptions/exceptions.filter';
import { LoggerModule } from 'nestjs-pino';
import { PinoConfig } from './pino.config';

@Module({
  imports: [
    LoggerModule.forRoot(PinoConfig)
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ExceptionsFilter
    },
    LokiLogger,
  ],
})
export class AppModule { }
