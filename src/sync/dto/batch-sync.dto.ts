import { IsString, IsArray, ValidateNested, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class SyncRecordItem {
  @IsString()
  date: string;

  @IsString()
  @IsIn(['washed', 'not_washed'])
  status: string;

  @IsOptional()
  @IsString()
  clientUpdatedAt?: string;
}

export class BatchSyncDto {
  @IsString()
  clientId: string;

  @IsString()
  idempotencyKey: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncRecordItem)
  records: SyncRecordItem[];
}
