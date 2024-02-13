import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { PinoConfig } from './pino.config';

@Module({
  imports: [
    LoggerModule.forRoot(PinoConfig)
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule { }
