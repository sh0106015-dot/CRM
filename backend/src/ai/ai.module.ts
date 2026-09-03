import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LlmClient } from './llm.client';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, LlmClient],
  exports: [AiService, LlmClient],
})
export class AiModule {}
