import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AiModule } from '../ai/ai.module';
import { SanctionsModule } from '../sanctions/sanctions.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { OsintService } from './osint.service';
import { GpsJammingService } from './gps-jamming.service';
import { DarkVesselService } from './dark-vessel.service';
import { CorrelationService } from './correlation.service';
import { GdeltPipelineService } from './gdelt-pipeline.service';

@Module({
  imports: [ScheduleModule.forRoot(), AiModule, SanctionsModule, EmbeddingsModule],
  providers: [OsintService, GpsJammingService, DarkVesselService, CorrelationService, GdeltPipelineService],
  exports: [OsintService, GpsJammingService],
})
export class OsintModule {}
