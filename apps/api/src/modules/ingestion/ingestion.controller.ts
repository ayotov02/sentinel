import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('upload')
  async upload(
    @Body()
    body: {
      filename?: string;
      fileType?: string;
      rawText?: string;
    },
  ) {
    return this.ingestionService.createJob(
      body.filename,
      body.fileType,
      body.rawText,
    );
  }

  @Get('jobs')
  async getJobs() {
    return this.ingestionService.getJobs();
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    return this.ingestionService.getJob(id);
  }

  @Patch('jobs/:id/review')
  async updateExtractedEntities(
    @Param('id') id: string,
    @Body() body: { entities: any[] },
  ) {
    return this.ingestionService.updateExtractedEntities(id, body.entities);
  }

  @Post('jobs/:id/confirm')
  async confirmEntities(
    @Param('id') id: string,
    @Body() body: { entities: any[] },
  ) {
    return this.ingestionService.confirmEntities(id, body.entities);
  }
}
