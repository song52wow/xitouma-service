import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RuleEngineService, AdviceResult } from './rule-engine.service';
import { WeatherService } from '../integrations/weather/weather.service';
import { WashAdviceDto } from './dto/wash-advice.dto';
import { getTodayStr, diffDays } from '../records/utils/date.util';

@Injectable()
export class AdviceService {
  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private weatherService: WeatherService,
  ) {}

  async getWashAdvice(user: User, dto: WashAdviceDto): Promise<AdviceResult> {
    const today = getTodayStr(user.timezone);
    const targetDate = dto.date || today;
    const month = parseInt(targetDate.substring(5, 7));
    const season = this.ruleEngine.getSeason(month);

    // 获取近期记录
    const recentRecords = await this.prisma.washRecord.findMany({
      where: {
        userId: user.id,
        recordDate: {
          lte: new Date(targetDate + 'T00:00:00Z'),
        },
        deletedAt: null,
      },
      orderBy: { recordDate: 'desc' },
      take: 30,
      select: { recordDate: true, status: true },
    });

    // 计算距上次洗头天数
    let daysSinceLastWash = 999;
    for (const r of recentRecords) {
      const dateStr = this.formatDate(r.recordDate);
      if (r.status === 'washed') {
        daysSinceLastWash = diffDays(targetDate, dateStr);
        break;
      }
    }

    // 计算连续洗头天数
    let consecutiveWashDays = 0;
    for (const r of recentRecords) {
      if (r.status === 'washed') {
        consecutiveWashDays++;
      } else {
        break;
      }
    }

    // 是否已记录今日
    const hasRecordedToday = recentRecords.some(
      (r) => this.formatDate(r.recordDate) === today,
    );

    // 获取天气数据
    let weather: { temperature: number; humidity: number; condition: string } | null = null;
    const region = dto.context?.region || user.region;
    if (dto.context?.weather?.temperature !== undefined) {
      weather = {
        temperature: dto.context.weather.temperature,
        humidity: dto.context.weather.humidity ?? 0,
        condition: dto.context.weather.condition ?? '',
      };
    } else if (region) {
      weather = await this.weatherService.getWeather(region);
    }

    // 运行规则引擎
    const result = this.ruleEngine.evaluate({
      hairType: user.hairType,
      hairLength: user.hairLength,
      daysSinceLastWash,
      consecutiveWashDays,
      season,
      weather,
      hasRecordedToday,
    });

    // 记录建议日志
    await this.prisma.adviceLog.create({
      data: {
        userId: user.id,
        decision: result.decision,
        confidence: result.confidence,
        inputSnapshot: {
          hairType: user.hairType,
          hairLength: user.hairLength,
          daysSinceLastWash,
          consecutiveWashDays,
          season,
          weather,
          hasRecordedToday,
        },
        outputSnapshot: result as any,
        provider: 'rule',
      },
    });

    return result;
  }

  private formatDate(date: Date): string {
    return (
      date.getUTCFullYear() +
      '-' +
      String(date.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(date.getUTCDate()).padStart(2, '0')
    );
  }
}
