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

### 3. 构建规则

仓库 → **构建** → **添加规则**（可为 `main` / `master` 各加一条，或只保留实际使用的分支）：

| 参数 | 值 |
|------|-----|
| 类型 | Branch |
| Branch/Tag | `main`（或 `master`） |
| 构建上下文目录 | `/`（仓库根目录，与 `Dockerfile` 同级） |
| Dockerfile 文件名 | `Dockerfile` |

**镜像版本（Tag）必须与 GitHub 部署使用的 tag 一致**，见下一节。

## 镜像 Tag 与 GitHub 对齐

部署时拉取的镜像为：

```text
${ACR_REGISTRY}/song52wow/xitouma-service:${IMAGE_TAG}
```

`IMAGE_TAG` 优先级：

1. 手动运行 workflow 时填写的 `image_tag`
2. 仓库变量 `ACR_IMAGE_TAG`
3. 默认：`${{ github.sha }}`（完整 40 位 commit）

### 方案 A：按 commit 部署（推荐，可回滚）

在 ACR 构建规则中配置镜像版本为**完整 Commit ID**（企业版可在规则里勾选「最近一次推送代码的 Commit ID」并设 40 位；或自定义 tag 模板包含完整 commit）。

无需改 GitHub 变量，workflow 默认用 `github.sha`。

### 方案 B：仅 `latest`（个人版常见）

若构建规则只打 `latest`：

在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 增加：

| 变量名 | 值 |
|--------|-----|
| `ACR_IMAGE_TAG` | `latest` |

## GitHub Secrets / Variables

### 仍需要（用于等待 ACR 镜像，非构建）

| Secret | 说明 |
|--------|------|
| `ACR_USERNAME` | ACR 登录用户名 |
| `ACR_PASSWORD` | ACR 登录密码 |

ECS 主机上需已 `docker login` 同一 registry（拉取私有镜像）。

### 可选 Variables

| 变量 | 默认 | 说明 |
|------|------|------|
| `ACR_IMAGE_TAG` | （空，用 commit SHA） | 与 ACR 构建规则 tag 一致，如 `latest` |
| `ACR_WAIT_ATTEMPTS` | `40` | 等待镜像次数 |
| `ACR_WAIT_INTERVAL_SEC` | `30` | 每次间隔秒数（最长约 20 分钟） |

其余 ECS / 应用配置见 [ecs-deploy.md](./ecs-deploy.md)。

## 发布流程

```text
git push main
    ├─► ACR：自动构建并推送镜像
    └─► GitHub Actions：wait-for-acr-image → deploy ECS
```

避免在 GitHub Actions 中再次构建同一镜像，否则会重复占用构建资源且 tag 可能冲突。

## 故障排查

| 现象 | 处理 |
|------|------|
| `Timed out waiting for ...` | 看 ACR **构建记录**是否失败；确认 tag 与 `ACR_IMAGE_TAG` / commit 一致 |
| ECS `docker pull` 失败 | 在 ECS 上执行 `docker login` 个人版 registry |
| 部署了旧代码 | 确认 ACR 规则分支与 push 分支一致；`latest` 方案确认已重新构建 |
