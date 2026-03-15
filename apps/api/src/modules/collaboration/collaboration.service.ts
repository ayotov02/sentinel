import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Y-Sweet SDK types - dynamically imported to handle missing dependency gracefully
let DocumentManager: any;

@Injectable()
export class CollaborationService implements OnModuleInit {
  private readonly logger = new Logger(CollaborationService.name);
  private manager: any = null;
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const ySweetUrl = this.configService.get<string>('Y_SWEET_URL');

    if (!ySweetUrl) {
      this.logger.warn(
        'Y_SWEET_URL not configured. Collaboration features will return mock tokens.',
      );
      return;
    }

    try {
      const ySweetSdk = await import('@y-sweet/sdk');
      DocumentManager = ySweetSdk.DocumentManager;
      this.manager = new DocumentManager(ySweetUrl);
      this.isAvailable = true;
      this.logger.log('Y-Sweet DocumentManager initialized successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Y-Sweet DocumentManager: ${error instanceof Error ? error.message : error}. ` +
          'Collaboration features will return mock tokens.',
      );
    }
  }

  async createDocument(docId: string): Promise<any> {
    if (!this.isAvailable || !this.manager) {
      this.logger.warn('Y-Sweet unavailable, returning mock document');
      return { docId, mock: true };
    }

    return this.manager.createDoc(docId);
  }

  async getToken(docId: string): Promise<any> {
    if (!this.isAvailable || !this.manager) {
      this.logger.warn('Y-Sweet unavailable, returning mock token');
      return {
        url: `ws://localhost:8080/doc/${docId}`,
        docId,
        token: 'mock-token',
        mock: true,
      };
    }

    return this.manager.getOrCreateDocAndToken(docId);
  }
}
