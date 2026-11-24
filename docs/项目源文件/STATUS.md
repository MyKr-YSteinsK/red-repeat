# 当前状态

## 生产与审阅候选

**已发布 1.29.1**。2026-11-24 已核对线上 `version.json` 为 `1.29.1 / 381f815cf803`，远端
`main` 指向 `381f815cf803db7a9ad6cbf3dd98b61e4e8c18e0`，`v1.29.1` 指向产品提交 `2c3a965`。
首轮构建恢复提交为 `93e2c33`，此前的接手维护基线 `97ac404` 已纳入发布历史。
[生产 CI](https://github.com/MyKr-YSteinsK/red-repeat/actions/runs/45328106762) · [发布记录](https://github.com/MyKr-YSteinsK/red-repeat/releases/tag/v1.29.1)

**1.30.0 MINOR 候选**。分支 `codex/iphone-library-practice` 从上述 main 分出，界面改造由
`3ff793e` 引入，版本账本指向补齐导航行为的最终产品提交 `fffb19f`。曲库搜索、学习段与当前句、
选段面板和播放控件现已作为一条路径重设计。返回期间若离线核验延迟，搜索、清空、筛选或主动
滚动会取消旧位置恢复。无新操作时核验完成后恢复歌曲锚点。继续学唱时从当前曲库位置重新取样。
Runtime contract 为 3。Edge 已验证短句、长句、密集 Ruby 末句、播放、断网三模式和两种返回方式。
Windows WebKit 已验证选段、减少动态效果及窄屏和横屏布局。iPhone 14 Pro 实机反馈与生产发布待审阅。
实际交付 SHA、CI、手机检查入口与结果见 [RED-Plan-95](https://github.com/MyKr-YSteinsK/red-repeat/issues/5)。
[前后对照与设备验收](../plan95/README.md)

六曲 93 个运行时文件与升级前逐字节一致。Zod 4.6.6 下生产审计为零告警，全量仍有 21 项开发工具链告警。
[升级审查与路线](升级审查与路线.md)记录解析入口、审计分组和 iPhone 14 Pro 设计方向。
候选 PR、本地与 Ubuntu 实测提交、完整验收及发布决定从两份 Issue 的交付回执恢复。
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

接手维护已随 `codex/incubator-refresh` 纳入升级分支历史。下一轮现有功能的 UI 与交互设计见
[升级审查与路线](升级审查与路线.md)。历史审稿中的 HOLD 和旧验证结论按对应快照使用。
