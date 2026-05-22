import { IsString, IsOptional } from 'class-validator';

export class DeviceLoginDto {
  @IsString()
  deviceId: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
