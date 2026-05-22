import { Module } from '@nestjs/common';
import { AdviceController } from './advice.controller';
import { AdviceService } from './advice.service';
import { RuleEngineService } from './rule-engine.service';
import { WeatherService } from '../integrations/weather/weather.service';

@Module({
  controllers: [AdviceController],
  providers: [AdviceService, RuleEngineService, WeatherService],
})
export class AdviceModule {}
