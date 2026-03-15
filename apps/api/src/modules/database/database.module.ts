import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Pool({
          host: config.get('POSTGRES_HOST', 'localhost'),
          port: config.get<number>('POSTGRES_PORT', 5432),
          database: config.get('POSTGRES_DB', 'sentinel'),
          user: config.get('POSTGRES_USER', 'sentinel'),
          password: config.get('POSTGRES_PASSWORD', 'sentinel_dev'),
          max: 20,
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
