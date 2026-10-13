import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IaService } from './ia.service.js';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30_000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  providers: [IaService],
  exports: [IaService],
})
export class IaModule {}
