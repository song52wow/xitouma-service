# ECS Deployment

## Files

- `.env.production`: production environment variables, copied from `.env.production.example`.
- `Dockerfile`: builds the NestJS app and Prisma client.
- `docker-compose.prod.yml`: runs the app on the ECS instance and joins the external `xitouma-net` network where PostgreSQL already runs.
- `deploy/nginx.conf`: reverse proxy example. Replace `your-domain.example.com`.

## Deploy

```bash
cp .env.production.example .env.production
# Edit .env.production before starting.
docker compose -f docker-compose.prod.yml up -d --build
curl http://127.0.0.1:3001/health
```

## GitHub Actions Deploy

The workflow is in `.github/workflows/deploy-ecs.yml`. It builds the NestJS
backend on GitHub Actions, uploads the current commit to the ECS instance over
SSH, assembles `.env.production` from GitHub Secrets and Variables, then runs
Docker Compose on the server.

### SSH Secrets (required)

| Secret | Description |
|--------|-------------|
| `ALIYUN_ECS_HOST` | ECS public IP or domain |
| `ALIYUN_ECS_USER` | SSH user (`deploy`) |
| `ALIYUN_ECS_SSH_KEY` | SSH private key |
| `ALIYUN_ECS_PORT` | Optional. Defaults to `22` |

### App Secrets (sensitive)

| Secret | Description |
|--------|-------------|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing secret |
| `WECHAT_SECRET` | WeChat mini program secret |
| `WEATHER_API_KEY` | Optional. QWeather API key. Leave empty to disable server-side weather |

### App Variables (non-sensitive)

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | PostgreSQL user |
| `POSTGRES_DB` | PostgreSQL database name |
| `WECHAT_APPID` | WeChat mini program AppID |
| `WECHAT_JSCODE2SESSION_URL` | Optional. Defaults to WeChat endpoint |
| `DEFAULT_TIMEZONE` | Optional. Defaults to `Asia/Shanghai` |
| `BACKFILL_WINDOW_DAYS` | Optional. Defaults to `30` |
| `CORS_ORIGIN` | Allowed CORS origin(s), comma-separated |
| `ECS_DEPLOY_PATH` | Optional. Defaults to `/opt/xitouma-backend` |
| `ECS_COMPOSE_PROJECT` | Optional. Defaults to `xitouma-backend` |
| `ECS_APP_PORT` | Optional. Host port for health check. Defaults to `3001` |
| `POSTGRES_HOST` | Optional. Defaults to `postgres` (Docker network alias) |

The workflow builds `DATABASE_URL` automatically:

```text
postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>?schema=public
```

Legacy option: set secret `ECS_ENV_PRODUCTION` to the full `.env.production`
file instead of the split keys above.

One-time ECS setup:

```bash
sudo mkdir -p /opt/xitouma-backend
sudo chown -R deploy:deploy /opt/xitouma-backend
docker compose version
```

If `ALIYUN_ECS_USER` is not `root`, make sure that user can run Docker without
an interactive password prompt.

## Required ECS Settings

- Open ports `80` and `443` in the ECS security group.
- Keep PostgreSQL private; do not expose port `5432` publicly.
- Use HTTPS for the mini program request domain.
- Add the HTTPS API domain in WeChat Mini Program admin as a valid request domain.

## Production Notes

- The app listens on container port `3000` and is published on host port `3001` by default.
- Use `docker compose -f docker-compose.prod.yml logs -f app` to inspect app logs.
- The app runs `prisma migrate deploy` before startup.
