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
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('alertType') alertType?: string,
  ) {
    return this.alertsService.findAll({ status, severity, alertType });
  }

  @Get('rules/all')
  async getRules() {
    return this.alertsService.getRules();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.alertsService.findById(id);
  }

  @Post()
  async create(
    @Body()
    body: {
      alert_type: string;
      severity: string;
      title: string;
      description?: string;
      entity_id?: string;
      lat?: number;
      lon?: number;
      properties?: Record<string, any>;
    },
  ) {
    return this.alertsService.create(body);
  }

  @Post(':id/acknowledge')
  async acknowledge(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.alertsService.acknowledge(id, body.userId);
  }

  @Post(':id/escalate')
  async escalate(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.alertsService.escalate(id, body.userId);
  }

  @Post(':id/dismiss')
  async dismiss(
    @Param('id') id: string,
    @Body() body: { userId: string; note: string },
  ) {
    return this.alertsService.dismiss(id, body.userId, body.note);
  }

  @Post('rules')
  async createRule(
    @Body()
    body: {
      name: string;
      rule_type: string;
      entity_filter?: Record<string, any>;
      trigger_condition: Record<string, any>;
      severity?: string;
      notification_channels?: string[];
      created_by?: string;
    },
  ) {
    return this.alertsService.createRule(body);
  }

  @Patch('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      rule_type?: string;
      entity_filter?: Record<string, any>;
      trigger_condition?: Record<string, any>;
      severity?: string;
      notification_channels?: string[];
    },
  ) {
    return this.alertsService.updateRule(id, body);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id') id: string) {
    await this.alertsService.deleteRule(id);
  }

  @Post('rules/:id/toggle')
  async toggleRule(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.alertsService.toggleRule(id, body.enabled);
  }
}
