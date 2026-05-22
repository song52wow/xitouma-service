import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { UsersModule } from '../users/users.module';
import { RecordsModule } from '../records/records.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [UsersModule, RecordsModule, StatisticsModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
