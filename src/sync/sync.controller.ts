import { Body, Controller, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { SyncService } from './sync.service';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('v1/sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('records')
  async batchSync(@CurrentUser() user: User, @Body() dto: BatchSyncDto) {
    return this.syncService.batchSync(user.id, dto, user.timezone);
  }
}
