import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [StatisticsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
