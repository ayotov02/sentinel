import { Module } from '@nestjs/common';
import { TimeseriesService } from './timeseries.service';
import { TimeseriesController } from './timeseries.controller';

@Module({
  providers: [TimeseriesService],
  controllers: [TimeseriesController],
  exports: [TimeseriesService],
})
export class TimeseriesModule {}
