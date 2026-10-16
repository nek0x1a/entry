# entry

运行在 Cloudflare Workers 上的个人入口站，目前提供书签展示与管理功能。

## 功能

### 书签
书签按分组展示，可标记重要分组，并在编辑页新增、修改、删除和拖动排序；数据保存在 Cloudflare D1 中，首页使用 Cache API 缓存读取结果。

## 技术栈

- React、React Router 和 TypeScript
- Vite 与 Cloudflare Vite 插件
- Cloudflare Workers、D1 和 Workers Cache API
- Tailwind CSS

## 本地开发

需要安装 Bun，并准备 Cloudflare Wrangler 配置。安装依赖：

```bash
bun install
```

首次配置时，可将 `wrangler.example.jsonc` 重命名为 `wrangler.jsonc` 并修改相关配置。

配置 D1 数据库后，应用数据库迁移：

```bash
bun run migrate-local-db
```

如需加载示例书签，可运行：

```bash
bun run init-local-db
```

该命令会执行 `scripts/data-init.sql`，清空本地书签表后写入示例数据。

启动开发服务器：

```bash
bun run dev
```

默认访问地址为 `http://localhost:5173`。首页展示书签，`/bookmark/edit` 提供管理界面。
编辑内容提交后写入 D1，并刷新首页缓存。

## 常用命令

| 命令                       | 说明                                                    |
| -------------------------- | ------------------------------------------------------- |
| `bun run dev`              | 启动本地开发服务器                                      |
| `bun run build`            | 构建生产版本                                            |
| `bun run preview`          | 本地预览生产构建                                        |
| `bun run typecheck`        | 生成 Cloudflare/React Router 类型并运行 TypeScript 检查 |
| `bun run migrate-local-db` | 配置本地数据库                                          |
| `bun run init-local-db`    | 重置本地书签数据并加载示例数据                          |
| `bun run deploy`           | 构建并部署到 Cloudflare Workers                         |

## 部署

部署前确认 `wrangler.jsonc` 的相关配置指向正确 CF 资源，并已完成 Cloudflare Wrangler 身份验证。对远程数据库应用迁移：

```bash
bunx wrangler d1 migrations apply entry-db --remote
```

然后部署 Worker：

```bash
bun run deploy
```

书签内容保存在 D1 数据库的 `bookmark_groups` 和 `bookmarks` 表中。
