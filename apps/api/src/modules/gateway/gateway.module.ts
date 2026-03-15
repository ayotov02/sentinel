import { Module } from '@nestjs/common';
import { SentinelGateway } from './sentinel.gateway';

@Module({
  providers: [SentinelGateway],
  exports: [SentinelGateway],
})
export class GatewayModule {}
