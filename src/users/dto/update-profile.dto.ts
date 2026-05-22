import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1, 2])
  gender?: number;

  @IsOptional()
  @IsString()
  @IsIn(['', 'short', 'medium', 'long'])
  hairLength?: string;

  @IsOptional()
  @IsString()
  @IsIn(['', 'oily', 'normal', 'dry'])
  hairType?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
