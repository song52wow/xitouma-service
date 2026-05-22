import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RecordsService } from '../records/records.service';
import { StatisticsService } from '../statistics/statistics.service';
import { getTodayStr } from '../records/utils/date.util';

@Injectable()
export class HomeService {
  constructor(
    private usersService: UsersService,
    private recordsService: RecordsService,
    private statisticsService: StatisticsService,
  ) {}

  async getHomeData(
    user: User,
    year?: number,
    month?: number,
  ) {
    const todayStr = getTodayStr(user.timezone);

    if (!year) year = parseInt(todayStr.substring(0, 4));
    if (!month) month = parseInt(todayStr.substring(5, 7));

    const [profile, todayRecord, records, statistics] = await Promise.all([
      this.usersService.getProfile(user.id),
      this.recordsService.getTodayRecord(user.id, user.timezone),
      this.recordsService.getMonthRecords(user.id, year, month),
      this.statisticsService.getSummary(user.id, user.timezone),
    ]);

    return {
      today: todayStr,
      todayStatus: todayRecord?.status || null,
      hasCheckedIn: todayRecord !== null,
      user: {
        id: profile.id,
        avatarUrl: profile.avatarUrl,
        gender: profile.gender,
        hairLength: profile.hairLength,
        hairType: profile.hairType,
      },
      records,
      statistics,
    };
  }
}
