import { Body, Controller, Get, Put, Param, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { RecordsService } from './records.service';
import { UpsertRecordDto } from './dto/upsert-record.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('v1/records')
export class RecordsController {
  constructor(private recordsService: RecordsService) {}

  @Put(':date')
  async upsert(
    @CurrentUser() user: User,
    @Param('date') date: string,
    @Body() dto: UpsertRecordDto,
  ) {
    return this.recordsService.upsertRecord(
      user.id,
      date,
      dto,
      user.timezone,
    );
  }

  @Get('today')
  async today(@CurrentUser() user: User) {
    return this.recordsService.getTodayRecord(user.id, user.timezone);
  }

  @Get('month')
  async month(
    @CurrentUser() user: User,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.recordsService.getMonthRecords(
      user.id,
      parseInt(year),
      parseInt(month),
    );
  }
}
