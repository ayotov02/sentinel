import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { GraphService } from './graph.service';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('neighbors/:entityId')
  async getNeighbors(
    @Param('entityId') entityId: string,
    @Query('depth') depth?: string,
  ) {
    return this.graphService.getNeighbors(
      entityId,
      depth ? parseInt(depth, 10) : 1,
    );
  }

  @Get('shortest-path')
  async shortestPath(
    @Query('source') source: string,
    @Query('target') target: string,
  ) {
    return this.graphService.shortestPath(source, target);
  }

  @Get('pagerank')
  async getPageRank() {
    return this.graphService.getPageRank();
  }

  @Get('communities')
  async getCommunities() {
    return this.graphService.getCommunities();
  }

  @Post('subgraph')
  async getSubgraph(@Body() body: { entityIds: string[] }) {
    return this.graphService.getSubgraph(body.entityIds);
  }
}
