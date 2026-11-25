# 当前状态

## 生产版本与真实使用反馈

**1.32.1 已正式发布，本阶段整体升级结束。** 2026-11-25，PR #12 将已审阅的 `ed306a18f137` 合入 `main@ebcc348fa5f9`。首次上线回读为 `1.32.1 / ebcc348fa5f9`。线上产品、远端 `v1.32.1` 和版本账本均指向 `7c5521c`，79 条版本及 tag 校验通过。后续文档同步触发的构建身份见 Plan-98 发布回执。[Release](https://github.com/MyKr-YSteinsK/red-repeat/releases/tag/v1.32.1) · [Plan-98](https://github.com/MyKr-YSteinsK/red-repeat/issues/11)

三阶段生产流程首次执行即通过。质量检查通过 54 个文件、475 项测试和双路径 PWA 检查。上传和部署日志均记录产物 `github-pages-1`（ID `14992057039`），部署请求使用相同 ID，Pages 环境部署 `8048530100` 成功。此前 1.32.0 设置和逐句微调的发布与重试记录保存在 Plan-97。[1.32.1 生产 CI](https://github.com/MyKr-YSteinsK/red-repeat/actions/runs/45547549884) · [1.32.0 发布回执](https://github.com/MyKr-YSteinsK/red-repeat/issues/9#issuecomment-7150439143)

现在进入真实使用反馈阶段。曲库、学唱、全曲、讲解、设置和逐句微调均已上线。iPhone 14 Pro Safari／主屏幕 PWA 的日常阅读、触控和自然启动接管留待使用时记录。后续修正由具体反馈和复现决定。[观察入口](RUNBOOK.md#iphone-体验验收)

发布前对照使用浏览器构建 `b314e4899f8d`。393×570 样本的讲解返回栏减少 48 px，微调底栏减少 53 px。十轮密集歌词四次选播和暂停的脚本时间中位数由 174.5 ms 降至 100.3 ms。[截图、测量与复跑入口](../plan98/README.md)

六曲 93 个运行时文件与升级前逐字节一致。Zod 4.6.6 下生产审计为零告警，全量仍有 21 项开发工具链告警。
[升级审查与路线](升级审查与路线.md)记录解析入口、审计分组和 iPhone 14 Pro 设计方向。
初次工程升级的本地与 Ubuntu 证据见历史回执。
[RED-Plan-93](https://github.com/MyKr-YSteinsK/red-repeat/issues/2) · [RED-Plan-94](https://github.com/MyKr-YSteinsK/red-repeat/issues/3)

### 1.29.1 候选实测

元数据提交 `e650f7d` 指向上面的 94 产品提交。Windows 使用 Node 24.16.0 / npm 11.13.0 从该锁文件
干净安装。54 个测试文件共 464 项通过，lint 为零错误、8 条既有告警，类型检查、六曲源校验、
仓库卫生和 75 条版本记录检查通过。两个 base 的构建与 PWA 产物检查通过，六条源警告均为可选 hero 缺失。
Edge 158.0.4370.33（390×844）在本地子路径验证六曲曲库、下载 NIGHT DANCER、断网三模式与返回恢复筛选，
并用错误歌词响应检验格式提示与重试恢复。真实 Windows 文件占用及跨盘自定义输出也已验收。
Ubuntu 首轮 quality 通过，部署 job 跳过。[首轮 CI](https://github.com/MyKr-YSteinsK/red-repeat/actions/runs/45322064113)

93／94 的 PR 质量结果见上述 Issue 回执。1.29.1 线上身份已在发布时核实，已安装客户端跨版本接管按实际设备记录。

## 现行能力

- 曲库优先读取可用的本地 Catalog 并在后台刷新缓存。有标题／歌手／专辑／songId 搜索及显式别名，
  以实际完成的快照筛选离线歌曲。手动下载与曲库的 H1→H2 刷新共享每首歌的任务，可看进度、取消和重试。
  任务状态跨页面保留在当前 App document 内。
- 进入歌曲时先解析活动 manifest。已准备的 Core 可复用，Practice 的就绪独立于可选讲解正文。
  三模式共享播放会话和有效时序，支持响应式歌词、Ruby、罗马字、译文和最近学习位置。
- 进度、速度、队列和歌词显示是本地状态。设置可进行白名单备份预览及恢复，也可独立导出 Timing 历史。
  Timing Debugger 的保存和导出按完整身份作用。
- 更新由后台探测和准备。用户在自然下次启动使用已准备的新 build。现有 Workbox 路由按需缓存资源，
  手动离线下载按 manifest 维护可用性。

## 已发布歌曲源

2026-11-23 从六个当前源包的 JSON 与 Feature 文件核对清单。

| Song ID | Segment | Occurrence | Section | Practice Unit | Feature |
| --- | ---: | ---: | ---: | ---: | ---: |
| `work-millennium-parade` | 61 | 61 | 11 | 10 | 7 |
| `senbonzakura` | 30 | 45 | 10 | 6 | 6 |
| `night-dancer-imase` | 34 | 49 | 11 | 11 | 7 |
| `shinkai-shoujo` | 43 | 43 | 12 | 12 | 8 |
| `mousou-kanshou-daishou-renmei` | 46 | 57 | 16 | 16 | 8 |
| `doushite-takase-toya` | 26 | 33 | 9 | 9 | 8 |
| **合计** | **240** | **288** | **69** | **64** | **44** |

`Ｗ●ＲＫ` 和 `千本桜` 的历史校准覆盖与适用身份见[历史归档摘要](HISTORY.md)。
NIGHT DANCER、深海少女、妄想感傷代償連盟、どうして仍按现有记录为 Provisional Timing。

## 维护基线 97ac404 的历史验收

本轮把孵化入口、仓库运维和历史证据整理为本目录，退役无活动入口的旧 Practice、Catalog resume、
预热和旧范围辅助模块及其专用测试。曲库主体与卡片、设置更新日志已从页面拆出。歌曲源、Runtime schema、
音频命令、存储键、PWA 配置和 CI 随当前合同维护。

- 相关测试 74 项通过。完整 Vitest 为 53 个文件、456 项通过。Lint 有 8 条既有
  `react-refresh/only-export-components` 警告，零错误。
- Library validation 为六个 Edition 与六条既有可选 hero artwork 警告。子路径 build 产出 93 个 Runtime 文件。
  `repo:hygiene`、`release:verify` 和 `pwa:inspect -- /red-repeat/` 通过。
- 隔离 Edge `158.0.4370.33`（390×844）验证曲库搜索、下载与离线筛选、断网进入已下载的 NIGHT DANCER 并切换
  三种模式、回曲库保存筛选、设置日志与 Timing Debugger 入口。iOS 真机、installed-PWA 跨版本激活、
  新的听感校准及生产部署验收本轮未执行。

接手维护已随 `codex/incubator-refresh` 纳入升级分支历史。95–98 已发布的体验改动与真实使用观察项见[升级审查与路线](升级审查与路线.md)。历史审稿中的 HOLD 和旧验证结论按对应快照使用。
