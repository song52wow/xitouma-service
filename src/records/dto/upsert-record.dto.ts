import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpsertRecordDto {
  @IsString()
  @IsIn(['washed', 'not_washed'])
  status: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  clientUpdatedAt?: string;
}
