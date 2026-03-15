import { Controller, Get, Param } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';

@Controller('collaboration')
export class CollaborationController {
  constructor(
    private readonly collaborationService: CollaborationService,
  ) {}

  @Get('token/:docId')
  async getToken(@Param('docId') docId: string) {
    return this.collaborationService.getToken(docId);
  }
}
