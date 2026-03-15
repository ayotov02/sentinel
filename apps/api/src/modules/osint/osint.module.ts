import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OsintService } from './osint.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [OsintService],
  exports: [OsintService],
})
export class OsintModule {}
