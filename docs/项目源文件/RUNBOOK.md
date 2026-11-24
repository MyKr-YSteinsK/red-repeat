# 运行手册

## 环境与命令

在 RED:REPEAT 仓库根执行。当前使用 Git、Node.js 24.x、npm 和 `package-lock.json`。
2026-11-23 在 Windows 下使用 Node `24.16.0`、npm `11.13.0`、Edge `158.0.4370.33` 验证。
CI 使用 Ubuntu 和 Node 24.x。音频与封面的生产构建依赖锁定的 `ffmpeg-static`、
`ffprobe-static` 和 `sharp`。运行时仅需静态 HTTP(S) 服务，没有数据库、账户、后端或必填密钥。

```sh
npm ci
npm run library:compile
npm run dev
```

在新机器从 `origin` 克隆并检出任务目标，按上面安装与生成。依赖树和生成物在每台机器复建。
开发路由与资源用 dev 服务地址。已安装 PWA 或离线验收使用构建产物和适合 Service Worker 的 origin；
普通 `dev` 不注册生产 Worker。

| 需要回答的问题 | 命令或入口 |
| --- | --- |
| 代码和回归 | `npm run lint`，`npm test -- <相关测试路径>`。完整测试用 `npm test`。 |
| Public Library 是否有效 | `npm run library:validate`。更换音源时 `npm run library:audio-hash -- <song-id>` 与 Timeline 对照。 |
| 干净构建及 TS | `npm run build` 包含 `library:compile`、`tsc -b` 与 Vite。 |
| Pages 子路径产物 | `npm run build -- --base=/red-repeat/`，再 `npm run pwa:inspect -- /red-repeat/`。 |
| 本地子路径浏览器 | 构建后 `npm run preview -- --host 127.0.0.1 --base=/red-repeat/`，打开终端显示的子路径地址。 |
| 构建输出与公开边界 | `npm run repo:hygiene`；生产只发布准确构建的 `dist/`。 |
| 版本和 tag 一致性 | `npm run release:verify`，版本、tag 与部署见[版本发布规范](../版本发布规范.md)。 |
| 生产身份 | 仅在授权发布边界用 `npm run release:smoke -- --url <url> --version <version> --commit <sha>`。 |

`library:validate` / `library:compile` 源根优先顺序为 `--source-root <path>`、
`RED_REPEAT_LIBRARY_ROOT`、仓库 `library/`。备用源编译仍会写默认 Runtime 输出目录。
用隔离工作树测试备用源，发布前保证生产来源为 canonical `library/`。

## 数据地图与恢复

| 位置 | 内容与恢复方式 |
| --- | --- |
| `library/<song-id>/` | 受版本控制的获批公开源。包含 manifest、lyrics、timeline、practice、Markdown、日本语层、MP3 和封面等。按[歌曲内容生成规范](../歌曲内容生成规范.md)写作与验证。 |
| `.private/` | 忽略的候选研究、材料来源和待验输入。由用户单独提供和保存。 |
| `public/library-runtime/`、`dist/`、`.cache/library-compiler/` | 生成的版本化资源、Web 产物、媒体缓存。用编译／构建恢复。 |
| 浏览器 `localStorage` | 练习、速度、最近会话、队列、显示偏好和 Timing。设置页导出备份或独立 Timing 历史，按身份匹配恢复。 |
| 浏览器 Cache Storage | 本地 Catalog、Worker 缓存和完整下载快照。换浏览器重新下载歌曲；先保护已有本机状态。 |
| `docs/delete/` | 本机待手动清理的旧文件。目录内的资料不参与运行、测试或提交。 |

## 活动实现入口

| 领域 | 代码 |
| --- | --- |
| 应用入口、曲库、页面导航 | `src/main.tsx`、`src/App.tsx`、`src/navigation.ts`。曲库主体、卡片、搜索和滑动在 `src/library/`。 |
| Canonical 源与编译 | `src/library/schema.ts`、`source-package.ts`、`validator.ts`、`compiler.ts`、`media.ts` 及对应入口。 |
| Catalog、Runtime 和 Edition 加载 | `src/runtime/runtime-client.ts`、`song-edition-loader.ts`、`song-edition.ts`、`src/library/runtime-schema.ts`、`src/edition/use-song-edition-core.ts`。 |
| 三模式、歌词和过渡 | `src/edition/SongEditionPage.tsx`、各 Workspace、`FeatureMarkdown.tsx`、`LyricDisplayPreferences.tsx`、`src/navigation/stable-context-transition.ts`、`src/App.css`。 |
| 音频生命期与有效区间 | `src/audio/audio-engine.ts`、`src/edition/song-playback-session.ts`、`use-song-edition-playback.ts`、`src/timeline/`。 |
| 本机状态、Timing、备份 | `src/practice/` 中各域 owner、`src/settings/SettingsPage.tsx`、`timing-export.ts`、`src/debugger/TimingDebuggerPage.tsx`。 |
| 离线下载和后台更新 | `src/pwa/song-download.ts` 负责事务，`song-download-tasks.ts` 管当前 document 的任务；`cache-routes.ts`、`catalog-cache.ts`、`update-manager.ts`、`register-service-worker-options.ts`、`vite.config.ts` 管缓存与 Worker。 |
| 版本与部署 | `src/settings/ReleaseHistory.tsx` 展示日志，`src/release/` 管账本与分组，`scripts/` 管检查，`.github/workflows/ci.yml` 管质量与 Pages 部署。 |

## 常见定位

- 曲库在 dev 为空或报缺失，先看 `public/library-runtime/catalog.json` 和当前源根，再运行
  `library:compile`。Compiler 使用输出所在文件系统的 `.red-repeat-compiler/`，默认在项目根、公共目录外。
  Node 24 的 SQLite 写锁由操作系统在进程结束时释放。相同输出竞争时等待当前任务结束后重试。
  旧 Runtime 保留至完整 staging 通过引用、文件集合和内容校验。两次 rename 之间最终路径可能短时缺失；
  Windows 占用时释放文件句柄，重跑原命令会先恢复上一份备份，再验证输入。请保留事务目录直到恢复完成。
  遇到旧式 `public/library-runtime.tmp-*`，先确认归属并移出 public，再重建；
  `pwa:inspect` 在交付目录重新校验 Runtime。不同输出可以位于不同盘，单个事务的 staging、备份与目标需同文件系统。
- 线上显示旧版本，先核对 `version.json` 的版本与 SHA，接着按客户端区分当前 document 和等待 worker。
  检查实际 CI 记录与自然重开结果。保留本机 Cache Storage 和 localStorage 以便验证。
- 发现同曲 Timing 未套用，先对照完整 song／Edition／audio／Timeline 与当前 Occurrence，
  再在设置查看原身份归档。Timing correction 入库需要与当前源一致，备份恢复也按各域兼容规则检查。
- 需要调试 H1/H2、取消、丢失资源或多入口导航时，使用隔离的浏览器 profile 与独立构建；
  以 manifest、缓存响应、故障后可用性和最终读取的数据为证据。
