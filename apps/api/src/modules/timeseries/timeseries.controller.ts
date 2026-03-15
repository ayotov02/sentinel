import { Controller, Get, Param, Query } from '@nestjs/common';
import { TimeseriesService } from './timeseries.service';

@Controller('timeseries')
export class TimeseriesController {
  constructor(private readonly timeseriesService: TimeseriesService) {}

  @Get('trajectory/:entityId')
  async getTrajectory(
    @Param('entityId') entityId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.timeseriesService.getTrajectory(entityId, start, end);
  }

  @Get('proximity')
  async getProximity(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radius') radius: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeWindow =
      start && end ? { start, end } : undefined;

    return this.timeseriesService.getProximity(
      parseFloat(lat),
      parseFloat(lon),
      parseFloat(radius),
      timeWindow,
    );
  }

  @Get('summary/:entityId')
  async getHourlySummary(
    @Param('entityId') entityId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.timeseriesService.getHourlySummary(entityId, start, end);
  }

  @Get('latest')
  async getLatestPositions(@Query('entityType') entityType?: string) {
    return this.timeseriesService.getLatestPositions(entityType);
  }
}
