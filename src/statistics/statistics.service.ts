import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTodayStr, addDays, getWeekday, getDaysInMonth } from '../records/utils/date.util';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async recalculate(userId: string, userTimezone: string = 'Asia/Shanghai') {
    // 获取所有记录（按日期升序）
    const records = await this.prisma.washRecord.findMany({
      where: { userId, deletedAt: null },
      orderBy: { recordDate: 'asc' },
      select: { recordDate: true, status: true },
    });

    const today = getTodayStr(userTimezone);

    // totalCheckIn: washed + not_washed 都计入
    const totalCheckIn = records.length;

    // monthWashed: 当前月 washed 记录数
    const currentMonthPrefix = today.substring(0, 7);
    const monthWashed = records.filter(
      (r) =>
        formatDate(r.recordDate).startsWith(currentMonthPrefix) &&
        r.status === 'washed',
    ).length;

    // maxStreak: 最长连续记录天数
    const sortedDates = records.map((r) => formatDate(r.recordDate)).sort();
    let maxStreak = 0;
    let streak = sortedDates.length > 0 ? 1 : 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = sortedDates[i - 1];
      const curr = sortedDates[i];
      const diff = this.diffDays(curr, prev);
      if (diff === 1) {
        streak++;
      } else {
        maxStreak = Math.max(maxStreak, streak);
        streak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, streak);

    // currentStreak: 从今天向前连续有记录的天数
    let currentStreak = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = addDays(today, -i);
      if (sortedDates.includes(expected)) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Upsert 统计快照
    await this.prisma.userStatistics.upsert({
      where: { userId },
      create: {
        userId,
        totalCheckIn,
        monthWashed,
        maxStreak,
        currentStreak,
        lastCalcDate: today,
        calculatedAt: new Date(),
      },
      update: {
        totalCheckIn,
        monthWashed,
        maxStreak,
        currentStreak,
        lastCalcDate: today,
        calculatedAt: new Date(),
      },
    });

    return { totalCheckIn, monthWashed, maxStreak, currentStreak };
  }

  async getSummary(userId: string, userTimezone: string = 'Asia/Shanghai') {
    // 获取统计快照
    let stats = await this.prisma.userStatistics.findUnique({
      where: { userId },
    });

    // 如果快照不存在或过期，重新计算
    const today = getTodayStr(userTimezone);
    if (!stats || stats.lastCalcDate !== today) {
      await this.recalculate(userId, userTimezone);
      stats = await this.prisma.userStatistics.findUnique({
        where: { userId },
      });
    }

    // 实时计算 weekData 和 monthData
    const weekData = await this.getWeekData(userId, userTimezone);
    const monthData = await this.getMonthData(userId, userTimezone);

    return {
      totalCheckIn: stats?.totalCheckIn || 0,
      monthWashed: stats?.monthWashed || 0,
      maxStreak: stats?.maxStreak || 0,
      currentStreak: stats?.currentStreak || 0,
      weekData,
      monthData,
    };
  }

  private async getWeekData(
    userId: string,
    userTimezone: string,
  ): Promise<number[]> {
    const today = getTodayStr(userTimezone);
    const dayOfWeek = getWeekday(today);
    const mondayStr = addDays(today, -(dayOfWeek - 1));
    const sundayStr = addDays(mondayStr, 6);

    const monday = new Date(mondayStr + 'T00:00:00Z');
    const sunday = new Date(sundayStr + 'T00:00:00Z');

    const records = await this.prisma.washRecord.findMany({
      where: {
        userId,
        recordDate: { gte: monday, lte: sunday },
        status: 'washed',
        deletedAt: null,
      },
      select: { recordDate: true },
    });

    const weekData = [0, 0, 0, 0, 0, 0, 0];
    const washedDays = new Set(
      records.map((r) => formatDate(r.recordDate)),
    );

    washedDays.forEach((date) => {
      const dayIndex = getWeekday(date) - 1;
      weekData[dayIndex] = 1;
    });

    return weekData;
  }

  private async getMonthData(
    userId: string,
    userTimezone: string,
  ): Promise<number[]> {
    const today = getTodayStr(userTimezone);
    const year = parseInt(today.substring(0, 4));
    const month = parseInt(today.substring(5, 7));
    const daysInMonth = getDaysInMonth(year, month);

    const monthStart = new Date(
      `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`,
    );
    const monthEnd = new Date(
      `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}T00:00:00Z`,
    );

    const records = await this.prisma.washRecord.findMany({
      where: {
        userId,
        recordDate: { gte: monthStart, lte: monthEnd },
        status: 'washed',
        deletedAt: null,
      },
      select: { recordDate: true },
    });

    const monthData = new Array(daysInMonth).fill(0);
    records.forEach((r) => {
      const day = r.recordDate.getUTCDate();
      monthData[day - 1] = 1;
    });

    return monthData;
  }

  private diffDays(date1: string, date2: string): number {
    const [y1, m1, d1] = date1.split('-').map(Number);
    const [y2, m2, d2] = date2.split('-').map(Number);
    return Math.round(
      (Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86400000,
    );
  }
}

function formatDate(date: Date): string {
  return (
    date.getUTCFullYear() +
    '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getUTCDate()).padStart(2, '0')
  );
}
