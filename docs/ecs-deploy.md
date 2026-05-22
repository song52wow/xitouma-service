# ECS Deployment

## Files

- `.env.production`: production environment variables, copied from `.env.production.example`.
- `Dockerfile`: builds the NestJS app and Prisma client.
- `docker-compose.prod.yml`: runs the app and PostgreSQL on the ECS instance.
- `deploy/nginx.conf`: reverse proxy example. Replace `your-domain.example.com`.

## Deploy

```bash
cp .env.production.example .env.production
# Edit .env.production before starting.
docker compose -f docker-compose.prod.yml up -d --build
curl http://127.0.0.1:3000/health
```

## GitHub Actions Deploy

The workflow is in `.github/workflows/deploy-ecs.yml`. It builds the NestJS
backend on GitHub Actions, uploads the current commit to the ECS instance over
SSH, writes `.env.production` from a GitHub Secret, then runs Docker Compose on
the server.

Required GitHub Secrets:

- `ALIYUN_ECS_HOST`: ECS public IP or domain.
- `ALIYUN_ECS_USER`: SSH user with permission to run Docker Compose.
- `ALIYUN_ECS_SSH_KEY`: private key for the SSH user.
- `ECS_ENV_PRODUCTION`: full contents of the production `.env.production` file.

Optional GitHub Secrets and Variables:

- Secret `ALIYUN_ECS_PORT`: SSH port. Defaults to `22`.
- Variable `ECS_DEPLOY_PATH`: server deploy directory. Defaults to `/opt/xitouma-backend`.
- Variable `ECS_COMPOSE_PROJECT`: Docker Compose project name. Defaults to `xitouma-backend`.

One-time ECS setup:

```bash
sudo mkdir -p /opt/xitouma-backend
sudo chown -R "$USER":"$USER" /opt/xitouma-backend
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

- Replace `JWT_SECRET`, `POSTGRES_PASSWORD`, `WECHAT_APPID`, and `WECHAT_SECRET`.
- Use `docker compose -f docker-compose.prod.yml logs -f app` to inspect app logs.
- The app runs `prisma migrate deploy` before startup.
