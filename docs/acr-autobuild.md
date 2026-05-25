# ACR 自动构建 + GitHub Actions 部署

镜像在**阿里云 ACR** 由 **`release-v*` Git tag** 触发构建；**push `main` 不会构建、不会部署**。
GitHub Actions 仅在 **推送 release tag**（或手动指定版本）时等待镜像并部署 ECS。

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

绑定 GitHub 仓库：`song52wow/xitouma-service`。

开启：**代码变更时自动构建镜像**（仅 Tag 规则会实际触发）。

构建设置建议：

- **海外机器构建**：GitHub 源建议开启。
- **不使用缓存**：建议关闭。

### 3. 构建规则（仅 Tag）

只保留 **Tag** 规则，**删除** Branch `main` / `master` 规则：

| 类型 | Branch/Tag 匹配 | ACR 镜像版本 | GitHub 部署 tag |
|------|-----------------|--------------|-----------------|
| Tag | `release-v*`（`$version`） | `$version` 部分 | 如 `0.0.1` |

**示例**：Git tag `release-v0.0.1` → 镜像 `.../xitouma-service:0.0.1`。

若 ACR 产出完整名 `release-v0.0.1`，设置 GitHub Variable `ACR_RELEASE_TAG_MODE=full`。

## 镜像 Tag 与 GitHub 对齐

```text
${ACR_REGISTRY}/song52wow/xitouma-service:${IMAGE_TAG}
```

| 触发 | `IMAGE_TAG` |
|------|-------------|
| `git push origin release-v0.0.1` | `0.0.1`（默认去掉 `release-v` 前缀） |
| 手动 workflow_dispatch | 必填 `image_tag`，如 `0.0.1` |

`git push origin main` **不会**触发本 workflow，也不会触发 ACR 构建（需已删除 Branch 规则）。

## 发布流程

```bash
# 1. 合并代码到 main（仅更新代码，不部署）
git push origin main

# 2. 打 release tag 并推送 → ACR 构建 + Actions 部署
git tag release-v0.0.2
git push origin release-v0.0.2
```

```text
git push release-v0.0.2
    ├─► ACR：Tag 规则构建 → :0.0.2
    └─► GitHub Actions：wait :0.0.2 → deploy ECS
```

## GitHub Secrets / Variables

| Secret | 说明 |
|--------|------|
| `ACR_USERNAME` | 等待镜像 / ECS `docker login` |
| `ACR_PASSWORD` | 同上 |

| 变量 | 默认 | 说明 |
|------|------|------|
| `ACR_RELEASE_TAG_MODE` | `version` | `full`：镜像 tag 用完整 Git tag 名 |
| `ACR_WAIT_ATTEMPTS` | `40` | 等待次数 |
| `ACR_WAIT_INTERVAL_SEC` | `30` | 间隔秒数 |

其余 ECS / 应用配置见 [ecs-deploy.md](./ecs-deploy.md)。

## 故障排查

| 现象 | 处理 |
|------|------|
| push main 后没部署 | 预期行为；请打 `release-v*` tag |
| `Timed out waiting for ...` | 查 ACR 构建是否成功；确认镜像 tag 为 `0.0.1` 等形式 |
| ECS pull 失败 | 检查 `ACR_USERNAME` / `ACR_PASSWORD` 与 ECS `docker login` |
