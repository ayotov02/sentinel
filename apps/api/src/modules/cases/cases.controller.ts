import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('owner') owner?: string,
  ) {
    return this.casesService.findAll({ status, owner });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.casesService.findById(id);
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      description?: string;
      classification?: string;
      owner?: string;
    },
  ) {
    return this.casesService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: string;
      classification?: string;
    },
  ) {
    return this.casesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.casesService.delete(id);
  }

  @Post(':id/entities')
  async addEntity(
    @Param('id') id: string,
    @Body() body: { entityId: string },
  ) {
    return this.casesService.addEntity(id, body.entityId);
  }

  @Delete(':id/entities/:entityId')
  async removeEntity(
    @Param('id') id: string,
    @Param('entityId') entityId: string,
  ) {
    return this.casesService.removeEntity(id, entityId);
  }

  @Get(':id/activities')
  async getActivities(@Param('id') id: string) {
    return this.casesService.getActivities(id);
  }
}
