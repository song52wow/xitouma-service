import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsService } from '../statistics/statistics.service';
import { UpsertRecordDto } from './dto/upsert-record.dto';
import { getTodayStr, diffDays, getDaysInMonth, isValidDateFormat } from './utils/date.util';

@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private statisticsService: StatisticsService,
  ) {}

  async upsertRecord(
    userId: string,
    date: string,
    dto: UpsertRecordDto,
    userTimezone: string,
  ) {
    if (!isValidDateFormat(date)) {
      throw new BadRequestException('日期格式错误，请使用 YYYY-MM-DD');
    }

    const today = getTodayStr(userTimezone);

    if (date > today) {
      throw new BadRequestException('不能记录未来日期');
    }

    const daysAgo = diffDays(today, date);
    const backfillWindow = parseInt(process.env.BACKFILL_WINDOW_DAYS || '30');
    if (daysAgo > backfillWindow) {
      throw new BadRequestException(`最多只能补录${backfillWindow}天内的记录`);
    }

    const recordDate = new Date(date + 'T00:00:00Z');

    const record = await this.prisma.washRecord.upsert({
      where: {
        userId_recordDate: { userId, recordDate },
      },
      create: {
        userId,
        recordDate,
        status: dto.status as 'washed' | 'not_washed',
        source: dto.source || 'app',
      },
      update: {
        status: dto.status as 'washed' | 'not_washed',
        source: dto.source || 'app',
        clientUpdatedAt: dto.clientUpdatedAt
          ? new Date(dto.clientUpdatedAt)
          : undefined,
      },
    });

    // 重算统计（不影响记录写入）
    try {
      await this.statisticsService.recalculate(userId, userTimezone);
    } catch (err) {
      // 统计重算失败不阻塞记录写入
    }

    return {
      date,
      status: record.status,
      updatedAt: record.updatedAt,
    };
  }

  async getTodayRecord(userId: string, userTimezone: string) {
    const today = getTodayStr(userTimezone);
    const recordDate = new Date(today + 'T00:00:00Z');

    const record = await this.prisma.washRecord.findUnique({
      where: {
        userId_recordDate: { userId, recordDate },
      },
    });

    if (!record) return null;

    return {
      date: today,
      status: record.status,
    };
  }

  async getMonthRecords(userId: string, year: number, month: number) {
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
        deletedAt: null,
      },
      orderBy: { recordDate: 'asc' },
    });

    return records.map((r) => {
      const d = r.recordDate;
      const dateStr =
        d.getUTCFullYear() +
        '-' +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getUTCDate()).padStart(2, '0');
      return { date: dateStr, status: r.status };
    });
  }
}
