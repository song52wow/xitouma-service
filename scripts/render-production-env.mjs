import { writeFileSync } from 'node:fs';

const outputPath = process.argv[2] || '/tmp/.env.production';
const legacyEnv = process.env.ECS_ENV_PRODUCTION;

if (legacyEnv) {
  writeFileSync(outputPath, `${legacyEnv.trim()}\n`, { mode: 0o600 });
  process.exit(0);
}

const postgresUser = process.env.POSTGRES_USER;
const postgresPassword = process.env.POSTGRES_PASSWORD;
const postgresDb = process.env.POSTGRES_DB;
const postgresHost = process.env.POSTGRES_HOST || 'postgres';

if (!postgresUser || !postgresPassword || !postgresDb) {
  console.error('Missing POSTGRES_USER, POSTGRES_PASSWORD, or POSTGRES_DB');
  process.exit(1);
}

const databaseUrl =
  `postgresql://${encodeURIComponent(postgresUser)}:` +
  `${encodeURIComponent(postgresPassword)}@${postgresHost}:5432/` +
  `${postgresDb}?schema=public`;

const lines = [
  `DATABASE_URL="${databaseUrl}"`,
  `JWT_SECRET="${process.env.JWT_SECRET}"`,
  'JWT_ACCESS_EXPIRES_IN="7200"',
  'JWT_REFRESH_EXPIRES_IN="2592000"',
  `WECHAT_APPID="${process.env.WECHAT_APPID}"`,
  `WECHAT_SECRET="${process.env.WECHAT_SECRET}"`,
  `WECHAT_JSCODE2SESSION_URL="${process.env.WECHAT_JSCODE2SESSION_URL || 'https://api.weixin.qq.com/sns/jscode2session'}"`,
  `WEATHER_API_KEY="${process.env.WEATHER_API_KEY || ''}"`,
  `DEFAULT_TIMEZONE="${process.env.DEFAULT_TIMEZONE || 'Asia/Shanghai'}"`,
  `BACKFILL_WINDOW_DAYS=${process.env.BACKFILL_WINDOW_DAYS || '30'}`,
  'HOST=0.0.0.0',
  'PORT=3000',
  `CORS_ORIGIN="${process.env.CORS_ORIGIN}"`,
  `POSTGRES_USER="${postgresUser}"`,
  `POSTGRES_PASSWORD="${postgresPassword}"`,
  `POSTGRES_DB="${postgresDb}"`,
];

writeFileSync(outputPath, `${lines.join('\n')}\n`, { mode: 0o600 });
