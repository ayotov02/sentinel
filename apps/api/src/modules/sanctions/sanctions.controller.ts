import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SanctionsService } from './sanctions.service';

@Controller('sanctions')
export class SanctionsController {
  constructor(private readonly sanctionsService: SanctionsService) {}

  /**
   * POST /sanctions/screen
   * Screen an entity against OpenSanctions for fuzzy matching.
   */
  @Post('screen')
  @HttpCode(HttpStatus.OK)
  async screenEntity(
    @Body()
    body: {
      name: string;
      entityType: string;
      properties?: Record<string, any>;
    },
  ) {
    return this.sanctionsService.screenEntity(
      body.name,
      body.entityType,
      body.properties,
    );
  }

  /**
   * GET /sanctions/search?q=
   * Full-text search against OpenSanctions.
   */
  @Get('search')
  async searchSanctions(@Query('q') query: string) {
    return this.sanctionsService.searchSanctions(query);
  }

  /**
   * POST /sanctions/import/ofac
   * Trigger bulk download and import of OFAC SDN XML.
   */
  @Post('import/ofac')
  @HttpCode(HttpStatus.OK)
  async importOfac() {
    return this.sanctionsService.bulkImportOFAC();
  }

  /**
   * POST /sanctions/import/un
   * Trigger bulk download and import of UN consolidated sanctions XML.
   */
  @Post('import/un')
  @HttpCode(HttpStatus.OK)
  async importUn() {
    return this.sanctionsService.bulkImportUN();
  }

  /**
   * GET /sanctions/stats
   * Get aggregate counts of sanctions entries by source and entity type.
   */
  @Get('stats')
  async getStats() {
    return this.sanctionsService.getStats();
  }
}
