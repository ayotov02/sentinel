import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @Body() body: { messages: { role: string; content: string }[]; systemPrompt?: string; model?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    try {
      const stream = await this.aiService.chat(body.messages, body.systemPrompt, body.model);
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    }

    res.end();
  }

  @Post('extract')
  async extractEntities(@Body() body: { text: string }) {
    return this.aiService.extractEntities(body.text);
  }

  @Post('briefing')
  async generateBriefing(
    @Body() body: { entityIds: string[]; timeRange: { start: string; end: string }; context?: string },
  ) {
    return this.aiService.generateBriefing(body.entityIds, body.timeRange, body.context);
  }

  @Post('analyze-image')
  async analyzeImage(@Body() body: { imageUri: string; prompt: string }) {
    return { analysis: await this.aiService.analyzeImage(body.imageUri, body.prompt) };
  }

  @Post('generate-image')
  async generateImage(@Body() body: { prompt: string }) {
    return this.aiService.generateImage(body.prompt);
  }

  @Post('semantic-search')
  async semanticSearch(@Body() body: { query: string; corpus: string[] }) {
    return this.aiService.semanticSearch(body.query, body.corpus);
  }
}
