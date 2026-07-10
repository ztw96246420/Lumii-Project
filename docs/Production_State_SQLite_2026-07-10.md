# Lumii 生产状态数据库迁移

日期：2026-07-10

## 1. 目标与边界

首发生产环境采用单后端实例。状态存储从单个 JSON 权威文件迁移为 SQLite/WAL：

- SQLite 是权威数据源。
- JSON 文件是每次提交后的实时回滚镜像，不再作为权威源。
- 现有滚动 gzip 快照继续保留，用于数据库校验失败后的恢复。
- 管理审计 JSONL 独立存放，不与业务快照混写。
- 扩展为多个后端实例前，必须再迁移到托管 PostgreSQL；当前方案不宣称支持多实例水平扩展。

选择同步 SQLite 接口，是因为现有后端的数百个业务写点均同步调用 `saveState()`。该方案可以在不改变业务事务边界的情况下加入数据库事务和版本冲突保护。Node.js 24 LTS 的 `node:sqlite` 提供同步 `DatabaseSync`，当前 API 状态为 Release Candidate：

- [Node.js 版本生命周期](https://nodejs.org/en/about/previous-releases)
- [Node.js 24 SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)

## 2. 持久化保证

`scripts/state-sqlite.cjs` 提供：

- `journal_mode=WAL`
- `synchronous=FULL`
- `busy_timeout=5000`
- `PRAGMA quick_check`
- 每个状态快照的 SHA-256 校验
- 单调递增 revision
- `UPDATE ... WHERE revision=?` 乐观并发控制
- 最近 5000 次提交的 revision/checksum 元数据
- 关闭服务时执行 WAL checkpoint

写入顺序：

1. 压缩不应入库的媒体 data URL。
2. SQLite `BEGIN IMMEDIATE` 事务提交新 revision。
3. 原子更新 JSON 回滚镜像。
4. 按间隔生成 gzip 快照并执行保留策略。

SQLite 提交失败时请求失败；JSON 镜像失败不会回滚已提交数据库，但会进入系统健康告警。

## 3. 数据目录

生产数据统一放在仓库之外：

```text
/home/ubuntu/lumii-data/
  lumii-state.sqlite
  lumii-state.sqlite-wal
  lumii-state.sqlite-shm
  lumii-backend-state.json
  admin-audit-journal.jsonl
  admin-export-files/
  state-backups/
```

目录和文件由 `ubuntu` 用户持有，systemd 使用 `UMask=0077`。

## 4. 运行时与配置

生产运行时固定为官方 Node.js `v24.18.0` Linux x64：

```text
安装目录：/opt/node-v24.18.0-linux-x64
官方 SHA-256：55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742
```

systemd 配置见：

```text
ops/systemd/lumii-backend.service.d/50-sqlite-state.conf
```

关键环境变量：

```text
LUMII_STATE_STORAGE_DRIVER=sqlite
LUMII_STATE_SQLITE_PATH=/home/ubuntu/lumii-data/lumii-state.sqlite
LUMII_BACKEND_STATE_PATH=/home/ubuntu/lumii-data/lumii-backend-state.json
STATE_BACKUP_DIR=/home/ubuntu/lumii-data/state-backups
```

## 5. 首次迁移

切换前必须停止业务写入并备份原始 JSON、审计日志和备份目录。迁移工具只会初始化空数据库；数据库已有不同内容时会拒绝覆盖：

```bash
/opt/node-v24.18.0-linux-x64/bin/node \
  /home/ubuntu/lumii-project/scripts/migrate-state-to-sqlite.cjs \
  --source /home/ubuntu/lumii-data/lumii-backend-state.json \
  --database /home/ubuntu/lumii-data/lumii-state.sqlite
```

迁移后再次执行只读校验：

```bash
/opt/node-v24.18.0-linux-x64/bin/node \
  /home/ubuntu/lumii-project/scripts/migrate-state-to-sqlite.cjs \
  --verify-only \
  --source /home/ubuntu/lumii-data/lumii-backend-state.json \
  --database /home/ubuntu/lumii-data/lumii-state.sqlite
```

## 6. 上线验收

必须同时满足：

- `/health` 返回 `state=success`。
- 后台系统健康 `state_database=ok`。
- `stateStorage.driver=sqlite`。
- `journalMode=wal`、`quickCheck=ok`、`revision>0`。
- JSON 回滚镜像存在且持续更新。
- gzip 快照数量大于 0。
- 上线台账 `state_storage=ready`。
- 登录、建档、宠友圈、AI 任务、通知、工单和后台写操作回归通过。

自动化覆盖：

```powershell
node scripts/smoke-state-sqlite.cjs
node scripts/smoke-admin-system-health-page.cjs
node scripts/smoke-launch-regression.cjs
```

## 7. 回滚

SQLite 每次成功提交后都会刷新 JSON 镜像。需回滚时：

1. 停止 `lumii-backend`。
2. 保留 SQLite、WAL、SHM 和 gzip 快照，不删除任何文件。
3. 使用临时 systemd 高优先级 drop-in 将 `LUMII_STATE_STORAGE_DRIVER` 改为 `json`，状态路径仍指向 `/home/ubuntu/lumii-data/lumii-backend-state.json`。
4. 重载 systemd 并启动服务。
5. 验证用户数、宠物数、最新业务写入和 `/health`。

回滚后禁止同时启动 SQLite 模式和 JSON 模式的两个后端进程。
