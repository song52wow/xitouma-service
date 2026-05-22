import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  async getWeather(region: string): Promise<WeatherData | null> {
    if (!region) return null;

    try {
      // 使用和风天气免费 API（需配置环境变量）
      // 如果未配置，返回 null 降级处理
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) return null;

      const response = await axios.get(
        `https://devapi.qweather.com/v7/weather/now`,
        {
          params: {
            location: region,
            key: apiKey,
          },
          timeout: 3000,
        },
      );

      const data = response.data;
      if (data.code !== '200') return null;

      const now = data.now;
      return {
        temperature: parseFloat(now.temp),
        humidity: parseFloat(now.humidity),
        condition: now.text,
      };
    } catch (err) {
      this.logger.warn(`Weather API failed: ${err.message}`);
      return null;
    }
  }
}
