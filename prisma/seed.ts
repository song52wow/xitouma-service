import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 清除已有数据
  await prisma.adviceLog.deleteMany();
  await prisma.syncBatch.deleteMany();
  await prisma.washRecord.deleteMany();
  await prisma.userStatistics.deleteMany();
  await prisma.userIdentity.deleteMany();
  await prisma.user.deleteMany();

  // 创建测试用户 1: 微信用户
  const user1 = await prisma.user.create({
    data: {
      nickname: '测试用户A',
      avatarUrl: '',
      gender: 1,
      hairLength: 'short',
      hairType: 'oily',
      region: '上海',
      timezone: 'Asia/Shanghai',
      identities: {
        create: {
          provider: 'wechat_mini',
          providerUserId: 'test_openid_001',
        },
      },
      statistics: {
        create: {},
      },
    },
  });

  // 创建测试用户 2: 设备用户
  const user2 = await prisma.user.create({
    data: {
      nickname: '测试用户B',
      avatarUrl: '',
      gender: 2,
      hairLength: 'long',
      hairType: 'dry',
      region: '北京',
      timezone: 'Asia/Shanghai',
      identities: {
        create: {
          provider: 'device',
          providerUserId: 'test_device_001',
        },
      },
      statistics: {
        create: {},
      },
    },
  });

  // 为用户1创建洗头记录（过去30天）
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const recordDate = new Date(dateStr + 'T00:00:00Z');

    // 油性发质，大约每2天洗一次
    const status = i % 2 === 0 ? 'washed' : 'not_washed';

    await prisma.washRecord.create({
      data: {
        userId: user1.id,
        recordDate,
        status,
        source: 'app',
      },
    });
  }

  // 为用户2创建洗头记录（过去15天）
  for (let i = 0; i < 15; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const recordDate = new Date(dateStr + 'T00:00:00Z');

    // 干性发质，大约每3天洗一次
    const status = i % 3 === 0 ? 'washed' : 'not_washed';

    await prisma.washRecord.create({
      data: {
        userId: user2.id,
        recordDate,
        status,
        source: 'app',
      },
    });
  }

  // 更新统计
  await prisma.userStatistics.update({
    where: { userId: user1.id },
    data: {
      totalCheckIn: 30,
      monthWashed: 15,
      maxStreak: 30,
      currentStreak: 30,
      lastCalcDate: today.toISOString().split('T')[0],
      calculatedAt: new Date(),
    },
  });

  await prisma.userStatistics.update({
    where: { userId: user2.id },
    data: {
      totalCheckIn: 15,
      monthWashed: 5,
      maxStreak: 15,
      currentStreak: 15,
      lastCalcDate: today.toISOString().split('T')[0],
      calculatedAt: new Date(),
    },
  });

  console.log('Seed completed!');
  console.log(`User 1 (WeChat): ${user1.id}`);
  console.log(`User 2 (Device): ${user2.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
