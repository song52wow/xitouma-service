import { Injectable } from '@nestjs/common';
import { WeatherData } from '../integrations/weather/weather.service';

export interface RuleInput {
  hairType: string;
  hairLength: string;
  daysSinceLastWash: number;
  consecutiveWashDays: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather: WeatherData | null;
  hasRecordedToday: boolean;
}

export interface AdviceResult {
  decision: 'wash' | 'not_wash' | 'neutral';
  confidence: number;
  title: string;
  summary: string;
  reasons: string[];
  tips: string[];
}

@Injectable()
export class RuleEngineService {
  evaluate(input: RuleInput): AdviceResult {
    // 已记录今日 → neutral
    if (input.hasRecordedToday) {
      return {
        decision: 'neutral',
        confidence: 100,
        title: '今天已经记录过了',
        summary: '你今天已经记录了洗头状态，可以明天再来查看建议。',
        reasons: ['今天已有记录'],
        tips: [],
      };
    }

    let washScore = 50; // 基础分数
    const reasons: string[] = [];
    const tips: string[] = [];

    // 规则1: 油性发质 >2天未洗 → wash
    if (input.hairType === 'oily' && input.daysSinceLastWash > 2) {
      washScore += 30;
      reasons.push('油性发质建议每 1-2 天洗一次');
    }

    // 规则2: 干性发质连续洗 ≥2天 → not_wash
    if (input.hairType === 'dry' && input.consecutiveWashDays >= 2) {
      washScore -= 25;
      reasons.push('干性发质连续洗头容易损伤发质');
    }

    // 规则3: ≥3天未洗 → wash
    if (input.daysSinceLastWash >= 3) {
      washScore += 35;
      reasons.push(`距离上次洗头已经 ${input.daysSinceLastWash} 天`);
    }

    // 规则4: 夏季提高频率
    if (input.season === 'summer') {
      washScore += 10;
      reasons.push('夏季天气炎热，建议适当增加洗头频率');
    }

    // 规则5: 冬季降低频率
    if (input.season === 'winter') {
      washScore -= 10;
      reasons.push('冬季天气干燥，可以适当减少洗头频率');
    }

    // 规则6: 高湿度 + 油性
    if (input.weather && input.weather.humidity > 80 && input.hairType === 'oily') {
      washScore += 5;
      reasons.push('当前湿度较高，油性发质容易出油');
    }

    // 规则7: 高温天气
    if (input.weather && input.weather.temperature > 30) {
      washScore += 5;
      reasons.push('当前天气较热');
    }

    // 正常发质兜底
    if (input.hairType === 'normal') {
      if (input.daysSinceLastWash >= 2) {
        washScore += 15;
        reasons.push('正常发质建议每 2 天洗一次');
      }
    }

    // 未设置发质的兜底
    if (!input.hairType) {
      if (input.daysSinceLastWash >= 2) {
        washScore += 20;
        reasons.push(`距离上次洗头已经 ${input.daysSinceLastWash} 天`);
      }
    }

    // 添加提示
    tips.push('使用温水洗头，避免过热的水刺激头皮');
    if (input.hairType === 'oily') {
      tips.push('可以选择控油型洗发水');
    }
    if (input.hairType === 'dry') {
      tips.push('建议使用滋润型洗发水，洗后使用护发素');
    }

    // 决策
    let decision: 'wash' | 'not_wash' | 'neutral';
    let title: string;
    let summary: string;

    if (washScore >= 60) {
      decision = 'wash';
      title = '建议今天洗头';
      summary = this.buildSummary(input, '洗', reasons);
    } else if (washScore <= 40) {
      decision = 'not_wash';
      title = '建议今天不洗头';
      summary = this.buildSummary(input, '不洗', reasons);
    } else {
      decision = 'neutral';
      title = '今天洗不洗都可以';
      summary = '根据你的情况，今天洗不洗头都可以，看你自己心情吧。';
    }

    const confidence = Math.min(100, Math.max(0, Math.abs(washScore - 50) * 2 + 50));

    return { decision, confidence, title, summary, reasons, tips };
  }

  getSeason(month: number): 'spring' | 'summer' | 'autumn' | 'winter' {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  private buildSummary(input: RuleInput, action: string, reasons: string[]): string {
    const hairDesc = this.getHairTypeDesc(input.hairType);
    const parts: string[] = [];

    if (hairDesc) {
      parts.push(`你是${hairDesc}发质`);
    }
    if (input.daysSinceLastWash > 0) {
      parts.push(`距离上次洗头已经 ${input.daysSinceLastWash} 天`);
    }

    if (parts.length > 0) {
      return `${parts.join('，')}，${reasons[0] || ''}，建议${action}头。`;
    }
    return `根据综合分析，建议${action}头。`;
  }

  private getHairTypeDesc(hairType: string): string {
    const map: Record<string, string> = {
      oily: '油性',
      normal: '正常',
      dry: '干性',
    };
    return map[hairType] || '';
  }
}
