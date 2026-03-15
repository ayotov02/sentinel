import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { EntitiesService } from './entities.service';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  async findAll(
    @Query('entityType') entityType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.entitiesService.findAll({
      entityType,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.entitiesService.search(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.entitiesService.findById(id);
  }

  @Post()
  async upsert(
    @Body()
    body: {
      entity_id: string;
      entity_type: string;
      display_name: string;
      properties?: Record<string, any>;
      source?: string;
      confidence?: number;
    },
  ) {
    return this.entitiesService.upsert(body);
  }
}
