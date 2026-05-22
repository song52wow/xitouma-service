import { IsOptional, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WeatherContext {
  @IsOptional()
  temperature?: number;

  @IsOptional()
  humidity?: number;

  @IsOptional()
  @IsString()
  condition?: string;
}

class AdviceContext {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeatherContext)
  weather?: WeatherContext;
}

export class WashAdviceDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdviceContext)
  context?: AdviceContext;
}
