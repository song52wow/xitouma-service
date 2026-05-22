import { IsString, IsOptional } from 'class-validator';

export class WechatMiniLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
