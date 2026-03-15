import { Module } from '@nestjs/common';
import { SanctionsService } from './sanctions.service';
import { SanctionsController } from './sanctions.controller';

@Module({
  providers: [SanctionsService],
  controllers: [SanctionsController],
  exports: [SanctionsService],
})
export class SanctionsModule {}
