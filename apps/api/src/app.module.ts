import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { TimeseriesModule } from './modules/timeseries/timeseries.module';
import { GraphModule } from './modules/graph/graph.module';
import { OsintModule } from './modules/osint/osint.module';
import { AiModule } from './modules/ai/ai.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { CasesModule } from './modules/cases/cases.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { SearchModule } from './modules/search/search.module';
import { SanctionsModule } from './modules/sanctions/sanctions.module';
import { VoiceModule } from './modules/voice/voice.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    EntitiesModule,
    TimeseriesModule,
    GraphModule,
    OsintModule,
    AiModule,
    GatewayModule,
    CasesModule,
    AlertsModule,
    CollaborationModule,
    IngestionModule,
    SearchModule,
    SanctionsModule,
    VoiceModule,
    EmbeddingsModule,
  ],
})
export class AppModule {}
