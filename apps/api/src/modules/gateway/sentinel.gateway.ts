import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/sentinel',
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class SentinelGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SentinelGateway.name);

  afterInit() {
    this.logger.log('SENTINEL WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('viewport:update')
  handleViewportUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() bounds: { north: number; south: number; east: number; west: number },
  ) {
    // Join H3 cell rooms based on viewport bounds
    // For now, join a global room
    client.join('global');
    this.logger.debug(`Client ${client.id} viewport: ${JSON.stringify(bounds)}`);
  }

  broadcastEntityUpdate(update: any) {
    this.server?.to('global').emit('entity:update', update);
  }

  broadcastEntityBatch(batch: any) {
    this.server?.to('global').emit('entity:batch', batch);
  }

  broadcastAlert(alert: any) {
    this.server?.emit('alert:new', alert);
  }

  broadcastPresence(userId: string, data: any) {
    this.server?.emit('presence:update', { userId, ...data });
  }
}
