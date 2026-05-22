import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsService } from '../statistics/statistics.service';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { getTodayStr } from '../records/utils/date.util';

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private statisticsService: StatisticsService,
  ) {}

  async batchSync(
    userId: string,
    dto: BatchSyncDto,
    userTimezone: string,
  ) {
    // 幂等检查
    const existing = await this.prisma.syncBatch.findUnique({
      where: {
        userId_clientId_idempotencyKey: {
          userId,
          clientId: dto.clientId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });

    if (existing) {
      return {
        syncedCount: existing.recordsCount,
        message: '该批次已同步',
      };
    }

    const today = getTodayStr(userTimezone);
    let syncedCount = 0;

    for (const item of dto.records) {
      // 禁止未来日期
      if (item.date > today) continue;

      const recordDate = new Date(item.date + 'T00:00:00Z');
      const existingRecord = await this.prisma.washRecord.findUnique({
        where: {
          userId_recordDate: { userId, recordDate },
        },
      });

      if (!existingRecord) {
        // 服务端无记录，直接插入
        await this.prisma.washRecord.create({
          data: {
            userId,
            recordDate,
            status: item.status as 'washed' | 'not_washed',
            source: 'app',
            clientUpdatedAt: item.clientUpdatedAt
              ? new Date(item.clientUpdatedAt)
              : undefined,
          },
        });
        syncedCount++;
      } else if (item.clientUpdatedAt) {
        // 有 clientUpdatedAt，比较时间戳
        const clientTime = new Date(item.clientUpdatedAt).getTime();
        const serverTime = existingRecord.updatedAt.getTime();

        if (clientTime > serverTime) {
          await this.prisma.washRecord.update({
            where: { id: existingRecord.id },
            data: {
              status: item.status as 'washed' | 'not_washed',
              clientUpdatedAt: new Date(item.clientUpdatedAt),
            },
          });
          syncedCount++;
        }
      }
      // 无 clientUpdatedAt 且服务端有记录，以服务端为准
    }

    // 创建同步批次记录
    await this.prisma.syncBatch.create({
      data: {
        userId,
        clientId: dto.clientId,
        idempotencyKey: dto.idempotencyKey,
        status: 'success',
        recordsCount: syncedCount,
      },
    });

    // 同步后重算统计
    if (syncedCount > 0) {
      try {
        await this.statisticsService.recalculate(userId, userTimezone);
      } catch {
        // 统计重算失败不影响同步结果
      }
    }

    return { syncedCount };
  }
}
