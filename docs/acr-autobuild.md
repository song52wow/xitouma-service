# ACR 自动构建 + GitHub Actions 部署

镜像在**阿里云 ACR**由代码推送触发构建；GitHub Actions（`.github/workflows/deploy-ecs.yml`）只负责**等待镜像就绪**并 **SSH 部署到 ECS**，不再执行 `docker build` / `docker push`。

## 控制台配置（一次性）

地域：**华南 1（深圳）**（与 `ACR_REGISTRY` 一致）

### 1. 绑定 GitHub 代码源

个人版实例 → **仓库管理** → **代码源** → 绑定 GitHub 账号。

### 2. 镜像仓库

| 项 | 值 |
|----|-----|
| 命名空间 | `song52wow` |
| 仓库名 | `xitouma-service` |
| 完整地址 | `crpi-df6i5zrps8a8t6ig.cn-shenzhen.personal.cr.aliyuncs.com/song52wow/xitouma-service` |

绑定 GitHub 仓库：`song52wow/xitouma-service`（与本项目 `origin` 一致）。

开启：**代码变更时自动构建镜像**。

构建设置建议：

- **海外机器构建**：若 Dockerfile 基础镜像是 `node:*` 等公网镜像，可开启；若构建经常超时再关闭。
- **不使用缓存**：建议关闭（加快重复构建）。

### 3. 构建规则（与当前 CI 对齐）

建议两条规则（上下文均为 `/`，Dockerfile 为 `Dockerfile`）：

| 类型 | Branch/Tag 匹配 | ACR 镜像版本（示例） | GitHub 部署拉取的 tag |
|------|-----------------|----------------------|------------------------|
| Branch | `main` | `latest`（或你自定义的固定 tag） | 同左，见 `ACR_MAIN_IMAGE_TAG` |
| Tag | `release-v*`（正则捕获 `$version`） | `release-v$version` 中的 **`$version` 部分** | 去掉 `release-v` 前缀后的版本号 |

**Tag 规则示例**：Git 打 tag `release-v1.2.3` → ACR 若产出镜像 tag `1.2.3`，CI 会自动等待并部署 `:1.2.3`。

若 ACR 实际产出的是**完整 tag 名** `release-v1.2.3`（未剥离前缀），在 GitHub Variables 设置：

| 变量名 | 值 |
|--------|-----|
| `ACR_RELEASE_TAG_MODE` | `full` |

## 镜像 Tag 与 GitHub 对齐

部署时拉取的镜像为：

```text
${ACR_REGISTRY}/song52wow/xitouma-service:${IMAGE_TAG}
```

Workflow 按 **push 类型** 自动解析 `IMAGE_TAG`：

| 触发 | 解析逻辑 |
|------|----------|
| `git push origin release-v1.2.3` | `1.2.3`（默认剥离 `release-v` 前缀） |
| `git push origin main` | `ACR_MAIN_IMAGE_TAG` → 否则 `ACR_IMAGE_TAG` → 否则 `latest` |
| 手动 workflow_dispatch | 输入框 `image_tag`（必填才覆盖） |

### 发布版本（推荐）

```bash
git tag release-v1.2.3
git push origin release-v1.2.3
```

ACR 按 Tag 规则构建 → Actions 等待 `:1.2.3` → 部署 ECS。版本号与 Git tag 一一对应，可回滚。

### 日常 main 联调

```bash
git push origin main
```

需保证 ACR **Branch: main** 规则的镜像版本与 `ACR_MAIN_IMAGE_TAG`（或默认 `latest`）一致。

注意：`:latest` 无法区分「旧镜像已存在」与「本次构建已完成」，生产发布请用 `release-v*` tag。

## GitHub Secrets / Variables

### 仍需要（用于等待 ACR 镜像，非构建）

| Secret | 说明 |
|--------|------|
| `ACR_USERNAME` | ACR 登录用户名 |
| `ACR_PASSWORD` | ACR 登录密码 |

部署 workflow 会在 ECS 上自动执行 `docker login`（使用 `ACR_USERNAME` / `ACR_PASSWORD`）。若手动在 ECS 上拉镜像，也需先登录同一 registry。

### 可选 Variables

| 变量 | 默认 | 说明 |
|------|------|------|
| `ACR_MAIN_IMAGE_TAG` | （空） | `main` 分支对应 ACR 镜像 tag，如 `latest` |
| `ACR_IMAGE_TAG` | （空） | `main` 的备用 tag（`ACR_MAIN_IMAGE_TAG` 未设时生效） |
| `ACR_RELEASE_TAG_MODE` | `version` | `version`：剥离 `release-v`；`full`：用完整 Git tag 名 |
| `ACR_WAIT_ATTEMPTS` | `40` | 等待镜像次数 |
| `ACR_WAIT_INTERVAL_SEC` | `30` | 每次间隔秒数（最长约 20 分钟） |

其余 ECS / 应用配置见 [ecs-deploy.md](./ecs-deploy.md)。

## 发布流程

```text
git push release-v1.2.3
    ├─► ACR：Tag 规则构建 → 推送 :1.2.3
    └─► GitHub Actions：resolve tag → wait → deploy ECS

git push main
    ├─► ACR：Branch 规则构建 → 推送 :latest（或你配置的 tag）
    └─► GitHub Actions：resolve tag → wait → deploy ECS
```

避免在 GitHub Actions 中再次构建同一镜像，否则会重复占用构建资源且 tag 可能冲突。

## 故障排查

| 现象 | 处理 |
|------|------|
| `Timed out waiting for ...` | 看 ACR **构建记录**是否失败；确认 tag 与 `ACR_IMAGE_TAG` / commit 一致 |
| ECS `docker pull` 失败 / `pull access denied` | 确认 GitHub `ACR_USERNAME` / `ACR_PASSWORD` 正确；或 SSH 到 ECS 手动 `docker login` 个人版 registry 后重试 |
| `curl: (56) Recv failure` / 健康检查失败 | 多为启动未完成（`prisma migrate deploy` 较慢）或应用崩溃；workflow 已改为最多等待 60s 并输出容器日志。仍失败时在 ECS 执行 `docker compose -f docker-compose.prod.yml logs app` 查 DB/环境变量 |
| 部署了旧代码 | 确认 ACR 规则分支与 push 分支一致；`latest` 方案确认已重新构建 |
