import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.searchService.globalSearch(q, {
      types: types ? types.split(',') : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('autocomplete')
  async autocomplete(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.autocomplete(
      q,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
