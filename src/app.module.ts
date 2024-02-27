import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { PinoConfig } from './pino.config';
import { LoggingInterceptor } from './logging.interceptor';
import { LokiLogger } from './logger';

@Module({
  imports: [
    // LoggerModule.forRoot(PinoConfig)
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LokiLogger,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    }
  ],
})
export class AppModule { }
