# Historical RED:REPEAT Development Forensics (2026-08-26)

> 状态：HISTORICAL EVIDENCE / NON-AUTHORITATIVE ARCHIVE。
>
> This report records a read-only migration audit centered on HEAD
> `c61f9776f6dd9799f6befa598bb510c35d93e103`. It has been mined for durable
> rationale in `docs/project/DECISIONS.md` and `CURRENT_STATE.md`; it must not
> be used as current implementation truth or as an execution Plan.

> 生成方式：只读取证。生成报告时未运行测试、构建或开发服务器，未修改产品代码、版本、Tag 或 Git 历史。
>
> 证据标记：
>
> - **FACT / MEASURED**：可以从 Git、文件、现有日志或 GitHub 页面直接验证。
> - **ESTIMATED / INFERENCE**：基于多个事实推导，但不能证明完整因果。
> - **UNAVAILABLE**：现有证据不足，未补造数据。
> - **RECOMMENDATION**：面向后续复盘的改进建议，不是历史事实。

## Forensic Scope

**FACT**

- 仓库：`D:\CS\red-repeat`
- 分支：`main`
- 远端：`https://github.com/MyKr-YSteinsK/red-repeat.git`
- Git 历史范围：
  - 首个 Commit：`d4a56acfb5d05ee96c67dbfcd41c079b9a09c604`
  - 时间：2026-08-18 02:05:50 +08:00
  - 最新 Commit：`1a8784eceb8a93ceb32b1d240326d390e9845aed`
  - 时间：2026-08-25 19:00:55 +08:00
- 总 Commit：189
- 当前版本：`1.6.1`
- Tags：37
- Release ledger entries：37
- 可访问 Plan：35 份；不存在 Plan 31 文件。
- Plan 总长度：29,590 行；平均 845.4 行；中位数 717 行；最大 2,144 行。
- 当前测试静态规模：48 个测试文件，323 个 `it()` / `test()` 声明。
- 分析时工作树已有：
  - `M AGENTS.md`
  - Diff：14 additions / 5 deletions
- `.private/`、`public/library-runtime/`、`dist/` tracked 文件数：0。

---

# 1. Development Timeline

## 1.1 项目总体节奏

**MEASURED**

| 日期 | Commit 数 | Tag 数 |
|---|---:|---:|
| 2026-08-18 | 38 | 3 |
| 2026-08-19 | 35 | 3 |
| 2026-08-20 | 10 | 2 |
| 2026-08-21 | 15 | 5 |
| 2026-08-22 | 9 | 4 |
| 2026-08-23 | 31 | 7 |
| 2026-08-24 | 36 | 10 |
| 2026-08-25 | 15 | 3 |
| 合计 | 189 | 37 |

仓库从初始化到 `1.6.1` 的墙钟跨度约 7 天 16 小时 55 分钟；这不是活跃开发工时。

## 1.2 主要阶段

| 时间 / Plan | 目标 | 关键 Commit | 版本 | 主要模块 | 返工与后续反馈 |
|---|---|---|---|---|---|
| 08-18，Plan 01 | React/TS/Vite、产品壳、PWA/CI 基线 | `d4a56ac`, `f1d4079`, `31e10f7` | 无 | 工程脚手架、App shell、CI | PWA 基线后续经历 Plans 09、22、25–29 的持续重构。 |
| 08-18，Plan 02 | 歌曲 source contract 与 Validator | `83d8e9f`, `0f309df`, `8023979` | 无 | `src/library/schema.ts`, validator, CI | 基础边界较稳定；Plan 23 因 Theme 退役删除 visual contract。 |
| 08-18，Plan 03 | Library Compiler 与 Runtime 资源 | `73bfb52`, `84d207a`, `1ece67e` | 无 | compiler、runtime schema/artifacts | 后续支持私有/公开曲库和 PWA；未发现大规模推翻。 |
| 08-18，Plan 04 | Audio Engine、Timeline、range/rate/repeat | `efa6550`–`a629850` | 无 | audio engine、timeline resolver | 发生过 race hardening，但核心模型后续被复用。 |
| 08-18，Plan 05 | RuntimeClient、首个 Liner Song Edition | `08114cf`–`ed4573e` | `0.1.0`, `0.1.1` | runtime client、Song Edition、lyrics | 后续真实浏览器发现 native fetch receiver bug，修复于 `f149145`。 |
| 08-18/19，Plan 06 | Timeline Debugger 与内容生产闭环 | `2d0ce5d`–`98353b4` | `0.2.0` | debugger、audio identity、导出 | 主要为稳定追加；没有证据显示架构被推翻。 |
| 08-19，Plan 07 | Ramp、Shadow、Focus、Immersive | `9501062`–`34775b7` | 无独立 tag | practice strategy、immersive UI | 多项能力在 Plan 23 的 1.0 简化中退出普通产品 UI。 |
| 08-19，Plan 08 | Liner/Cinema/Nocturne 三 Theme | `82f1c47`–`6a04fa7` | `0.3.0`–`0.3.2` | theme preference、art direction、三套视觉 | **重大推翻**：Plan 23 的 `53cd993` 删除 41 个文件、2,366 行，整体退役 Theme/visual contract。 |
| 08-19，Plan 09 | PWA 静态部署、runtime cache | `c593278`–`fef5692` | 无 | SW 注册、cache routes、warmup | 为后续 update manager 奠基，但未解决生产自更新。 |
| 08-19，Plan 10 | 私有内容边界与真实歌曲输入 | `c7232b2`, `3750f87`, `3b6421c` | 无 | `.private` root、hygiene、内容文档 | 内容导入按要求未提交；边界保持稳定。 |
| 08-19，人工 Runtime bug | 修复原生 fetch receiver | `f149145` | 无单独 tag | `runtime-client.ts` + regression test | 旧测试只注入普通 mock，未覆盖浏览器 receiver 语义。 |
| 08-20/21，Plans 11–15 | Practice Unit、播放会话、循环/速度/渐速/微调 | `9547739`–`a5c8f48` | `0.4.0`–`0.5.0` | Practice contract/runtime/workspace/controller | **高返工起点**。随后 Plans 12、14、21、23、30、32–36 持续修改 Practice。 |
| 08-21，Plans 16–17 | Full Song 连续播放器与移动端触摸 | `742ec3d`–`da13211` | `0.6.0`–`0.6.2` | FullSongWorkspace、连续歌词、seek | 初版后立即发生移动首屏可达和触摸跟随修复；之后 Plan 21、34–36 再次修改。 |
| 08-22，Plan 18 | Explain 主题页与歌词引用 | `7b44de5`–`3fee8ac` | `0.7.0` | ExplainWorkspace、quote card | 后续重点返工是底部导航和切换滚动。 |
| 08-22，Plans 19–20 | 曲库“继续学习”、中文产品壳、旧状态迁移 | `009ac0e`–`5acedff` | `0.8.0`–`0.8.2` | resume、catalog、shell | 连续两个 PATCH 修复 legacy resume 分类，表明迁移边界初版不完整。 |
| 08-23，Plan 21 | Practice/Full Song 布局整体打磨 | `0df4065`–`e579d61` | `0.8.3` | App CSS、Practice、Full Song | 移动 Practice 控件、Full Song desktop visibility 均发生补修。 |
| 08-23，Plan 22 | 公开曲库、离线下载、安装体验 | `7a4f7c6`–`e95ad0b` | `0.9.0`, `0.9.1` | public library、download、brand、Pages | Full Song tabs 立即补修。 |
| 08-23，Plan 23 | 1.0 产品简化 | `53cd993`–`4f9ebd1` | `1.0.0` | Theme 退役、Practice/Full Song/Explain、settings | **重大产品重构**：删除三 Theme；同时继续强化歌曲地图，但地图后续又被删除。 |
| 08-23，Plan 24 | 语义版本与更新日志 | `ade6d45`–`386fdbe` | `1.1.0` | release ledger、changelog、workflow | Release tooling 后续 Plan 29 再次调整。 |
| 08-23/24，Plan 25 | PWA 版本检测、一键更新 | `3fb5f7e`–`8eaf6e6` | `1.2.0`–`1.2.3` | update manager、version probe、prompt/settings | 真实手机暴露 remote probe 与 worker 生命周期竞态。 |
| 08-24，Plan 26 | worker-ready 竞态与远端更新说明 | `d986a76`–`49e1fe3` | `1.2.4`, `1.2.5` | update manager、release fixtures、CI ledger | 修复后又发现 registration 回调到达更晚的第二竞态。 |
| 08-24，Plan 27 | PWA registration 时序竞态 | `a308045` | `1.2.6` | update manager/test | 增加 57 行测试、6 行实现；属于前一状态机遗漏边界。 |
| 08-24，Plan 28 | 移动曲库卡片紧凑重排 | `7b03b19` | `1.3.0` | catalog cards、App.css | 后续 Plan 30 添加 swipe tray、Plan 32 再轻化 installed state。 |
| 08-24，Plan 29 | 发布链与 production probe 可靠性 | `cdc6698`–`6197de9` | `1.3.1` | CI/Pages、probe、production smoke | 解决长期手机停留旧版、双 workflow 和错误 probe base。 |
| 08-24，Plan 30 | Practice 控制器、曲库滑动操作 | `5b7d443`–`c5c39fa` | `1.4.0` | Practice dock、catalog swipe | Practice 控制器仍在 Plans 32–36 反复修改。 |
| 08-24，Plan 32 | Practice 地图和底部工作台 | `c1caafa`–`61fdcb5` | `1.4.1` | Practice map、floating dock、Explain footer | **后续推翻**：Plan 35 删除正文歌曲地图，改为 picker sheet。 |
| 08-24，Plan 33 | Practice/Explain 控制器视觉纠偏 | `58385d3` | `1.4.2` | App.css、两个 workspace | 很快被 Plan 34 全局统一覆盖。 |
| 08-25，Plan 34 | 统一圆角控件和整宽 Practice 控制层 | `598b384` | `1.5.0` | 15 个 UI 文件、global control classes | **明确回归**：Plan 35 称其造成 Full Song 已验证播放器被全局样式覆盖。 |
| 08-25，Plan 35 | 恢复播放器、删除地图、稳定切换 | `838f8e0`–`7039a15` | `1.6.0` | Full Song、Practice picker、Explain、transition utility | **再次发生回归**：错误移动 grid、92% 假玻璃、Full Song blur 遗漏、View Transition 黑闪、固定空白、滚动语义问题。 |
| 08-25，Plan 36 | 真机 7 项硬修复 | `895dfeb`–`4cfe378`, `b2871d0` | `1.6.1` | Practice geometry、glass、Full Song、scroll/transition | 删除刚引入的 native View Transition；用测量替代固定 11rem；再次修改切段语义。 |

## 1.3 反复修改超过两次的区域

**MEASURED**

| 区域 | Touch / churn | 证据 |
|---|---:|---|
| `src/App.css` | 71 commits；+6,081 / -2,339 | 全仓最高热点，承载多个页面、响应式、播放器和全局控件。 |
| `PracticeWorkspace.tsx` | 26 commits；+2,886 / -2,348 | 当前文件仅 538 行，但历史增删合计超过 5,200 行。 |
| `PracticeWorkspace.test.tsx` | 26 commits；+2,075 / -1,562 | 测试跟随 UI/语义频繁重写。 |
| `App.tsx` | 20 commits；+1,072 / -270 | 产品壳、路由、PWA/UI 多次交叉。 |
| `FullSongWorkspace.tsx` | 9 commits；+767 / -148 | 从 Plan 16 到 Plan 36 多次修复移动布局和视觉。 |
| `update-manager.ts` | 当前 543 行 | 初版 `3fb5f7e` 325 行；随后多个 race 修复。 |
| `update-manager.test.ts` | 12 commits；+462 / -40 | 竞态通常在用户发现问题后再补测试。 |

## 1.4 最明显的架构/UI 推翻

1. **Theme 系统**

   - Plan 08 花费多个 commit 建立三 Theme、偏好、art direction 和运行时视觉契约。
   - `53cd993` 在 Plan 23 删除 41 个文件、2,366 行。
   - 这是项目中证据最明确的大规模架构退役。

2. **Practice 歌曲地图**

   - Plan 23 和 Plan 32 都要求加高、内部滚动和自动聚焦。
   - `c1caafa` 再次投入 118 additions / 24 deletions。
   - Plan 35 明确删除 JSX、state、refs、scroll helper 和 tests，改为 Segment Picker。

3. **全局控件统一**

   - `598b384` 修改 15 个 UI 文件，统一 `control-sheet/control-button`。
   - Plan 35 明确记录该统一覆盖了“已经真实使用验证”的 Full Song visual contract。
   - `838f8e0` 随即恢复独立播放器。

4. **Stable View Transition**

   - Plan 35 引入 `stable-context-transition.ts` 和 native `startViewTransition()`。
   - Plan 36 确认其为 iOS/PWA 黑闪来源。
   - `dd9d9db` 删除 105 行相关路径。

---

# 2. Execution Time Analysis

## 2.1 数据覆盖限制

- 历史 shell 不保存系统级命令审计和持续时间数据库。
- Git commit 不记录测试耗时。
- 对话保留了 Plan 36 的较完整命令结果，但前面大部分 Plan 的详细命令日志已不可用。
- GitHub REST API 取证时遇到共享 IP rate limit；本机没有 `gh` CLI。
- 因此不能可靠给出整个项目所有命令的总次数和总耗时。

## 2.2 Plan 36 本地命令样本

| 类别 | 状态 | 次数 | 平均 | 中位数 | 最大 | 总计 | 说明 |
|---|---|---:|---:|---:|---:|---:|---|
| Targeted Vitest invocation | **MEASURED** | 8 | 3.44s | 3.5s | 3.9s | 27.5s | 包含两次失败后重跑；失败之一是测试 URL scheme 设置问题。 |
| Full `npm test` | **MEASURED/PARTIAL** | 1 | — | — | — | runner 20.23s | 与 lint/typecheck 并行；命令独立墙钟不可分离。48 files / 322 tests。 |
| lint + typecheck + full test 并行批次 | **MEASURED** | 1 | — | — | 27.5s | 27.5s | 三命令的外层共同墙钟。 |
| Standard build | **MEASURED** | 1 | 13.0s | 13.0s | 13.0s | 13.0s | 内含 library compile + `tsc -b`；Vite 阶段 2.72s。 |
| `/red-repeat/` base build | **MEASURED** | 1 | 8.6s | 8.6s | 8.6s | 8.6s | 同样内含 compile + typecheck；Vite 阶段 189ms。 |
| 两次 build 合计 | **MEASURED** | 2 | 10.8s | 10.8s | 13.0s | 21.6s | 大部分时间不在 Vite bundle 本身。 |
| PWA inspect | **PARTIAL** | 2 | — | — | — | ≥1.2s | base inspect 单独为 1.2s；另一次在 7.4s 并行批次中。 |
| release verify | **PARTIAL** | 2 | — | — | 5.4s | ≥5.4s | tagged verify 为 5.4s；另一次在 7.4s 批次中。 |
| repo hygiene | **PARTIAL** | 1 | — | — | — | — | 与 release/PWA checks 并行，总批次 7.4s。 |
| Production smoke | **MEASURED** | 1 | 1.9s | 1.9s | 1.9s | 1.9s | 一次成功，无重试。 |
| Push main | **MEASURED** | 1 | 8.0s | 8.0s | 8.0s | 8.0s | 网络操作。 |
| Push tag | **MEASURED** | 1 | 3.6s | 3.6s | 3.6s | 3.6s | 网络操作。 |
| Vite dev startup | **MEASURED/PARTIAL** | 1 | — | — | — | wrapper 10.2s | Vite 自报 ready 252ms；其余主要是工具等待。 |

## 2.3 GitHub Actions

早期 CI #1–#14 的可读运行页给出以下总耗时：

```text
21, 27, 32, 35, 44, 44, 56, 54, 54, 61, 47, 62, 65, 72 seconds
```

| Cohort | 状态 | 次数 | 平均 | 中位数 | 最大 | 总耗时 |
|---|---|---:|---:|---:|---:|---:|
| CI #1–#14 | **MEASURED SAMPLE** | 14 | 48.1s | 50.5s | 72s | 674s |
| CI #40 | **MEASURED** | 1 | 123s | 123s | 123s | 123s |
| CI #40 quality | **MEASURED** | 1 | 64s | 64s | 64s | 64s |
| CI #40 deploy | **MEASURED** | 1 | 51s | 51s | 51s | 51s |
| 全历史 Actions | **UNAVAILABLE** | — | — | — | — | — |

CI #40 对 `1a8784e` 成功，总耗时 2m03s，quality 1m04s、deploy 51s，并生成 4.86 MB Pages artifact：

<https://github.com/MyKr-YSteinsK/red-repeat/actions/runs/32840230395>

早期 Actions 页面及运行记录可验证 #1–#14 均成功：

<https://github.com/MyKr-YSteinsK/red-repeat/actions>

## 2.4 当前 CI 的重复验证结构

当前 `.github/workflows/ci.yml` 对一次 `main` push 静态执行：

| 操作 | quality | deploy | 总次数/Push |
|---|---:|---:|---:|
| `npm ci` | 1 | 1 | 2 |
| release verify | 1 | 0 | 1 |
| lint | 1 | 0 | 1 |
| 独立 typecheck | 1 | 0 | 1 |
| test | 1 | 0 | 1 |
| library validate | 1 | 1 | 2 |
| 独立 library compile | 1 | 1 | 2 |
| repo hygiene | 1 | 0 | 1 |
| build | 2 | 1 | 3 |
| build 内嵌 library compile | 2 | 1 | 3 |
| build 内嵌 typecheck | 2 | 1 | 3 |
| PWA inspect | 2 | 1 | 3 |
| production smoke | 0 | 1 | 1 |

因此一次成功的 `main` push 实际包含：

- Library compile：5 次。
- Typecheck：4 次。
- Library validate：2 次。
- PWA inspect：3 次。
- 三次 build，其中两次是同一 quality job 中的 root/base build。

**FACT**

同一 job 内的 standalone compile/typecheck 与后续 build 之间没有源码变化，compile/typecheck 的第二、第三次运行不会验证新的源码状态。

**INFERENCE**

base build 和 root build 的 Vite bundling/base-path 输出有不同价值，但它们不需要再次执行同一个 library compiler 和完整 TypeScript compilation。可以拆分“prepare/typecheck”与“bundle with base”以保留验证、减少重复。

## 2.5 UI-only 修改触发重型检查

- Plan 28 的曲库卡片重排、Plan 33/34/36 的 UI 修改最终都会在 push 后经过完整 CI。
- 当前 workflow 无 path/risk 分级，因此 UI-only push 同样运行 library validate/compile、双 PWA inspect、release verify 和部署。
- Plan 36 本身明确是 release boundary，因此其 PWA/release/production smoke 并非违反 Plan；但对中间 UI commit 来说，本地和 CI 的重复 compile/typecheck 边际价值较低。
- 历史每个 UI commit 是否都立即 push：**UNAVAILABLE**。189 commits 明显多于可见 Actions run 数，说明至少有部分 commit 已批量推送。

## 2.6 外部状态等待与重试

- Plan 36 CI：2m03s，production smoke 一次成功，无重复等待。
- PWA Plans 25–29 有真实手机持续停留旧版本的多轮开发，但各轮等待 Pages、真机重装或重试的精确耗时：**UNAVAILABLE**。
- 没有证据支持把这些等待量化为小时数。
- 本次取证自己的 API rate limit 和缺失 `gh` 不属于项目开发验证耗时。

---

# 3. Verification Value Analysis

| 验证 | 实际证明过的价值 | 未覆盖/逃逸问题 | 价值判断 |
|---|---|---|---|
| Unit tests | Audio/timeline、schema/compiler、Practice state、PWA manager 等有大量回归测试；当前静态规模 323 个声明。`f149145` 新 test 确实会让旧 receiver bug 失败。 | 多数关键 regression test 是用户发现问题后补写，不能反向证明旧测试曾阻止这些问题。jsdom 无法验证真实 Safari/PWA compositing、backdrop、layout geometry。 | 对纯逻辑高价值；对视觉和浏览器原生边界有限。 |
| Typecheck | 能保护接口、状态和数据流。 | 没有保留证据说明历史上具体抓到哪个生产 bug。所有可见最终日志都 PASS。 | 成本低至中；应保留一次，不应在同一 job 重复 3–4 次。 |
| Lint | 保持代码规范；#40 仍报告两条 Fast Refresh warning。 | 不会发现错误 grid、92% 假玻璃、PWA race 或 scroll 语义。 | 低成本，但与用户可见正确性相关性低。 |
| Build | 证明 compiler、TS 和 Vite bundle 能完成。 | RuntimeClient receiver bug、移动 UI、PWA 更新竞态均能在 build PASS 后存在。 | Release 必需；普通 UI patch 中重复执行价值低。 |
| Library validate | 能保护真实歌曲 source contract 和私有/公开内容边界。 | 与大多数 UI/PWA bug 无关。 | 内容/contract 任务高价值；UI-only 低价值。 |
| Library compile | 能发现 runtime artifact 生成错误。 | 不能发现播放器 CSS 和 update lifecycle bug。 | compiler/content 任务高价值；当前 CI 每 push 五次明显重复。 |
| PWA inspect | 当前可检查 manifest/precache/base/build identity。Plan 29 后新增 identity 保护。 | Plan 25–27 的 worker-ready、registration timing 和真机激活问题长期通过 artifact inspection。 | 对静态产物高价值；对真实 SW 生命周期低覆盖。 |
| Release verify | 能检查 package/ledger/tag/build metadata 一致性。 | v1.2.4、v1.3.1、v1.6.0 tags 实际指向 CI/test commit，说明“用户可见实现 commit”语义过去并未完全保持。 | Release boundary 高价值；普通实现 commit 无需重复。 |
| Production smoke | Plan 29 后可证明 Pages 上 `version.json` 的 version/SHA 是当前部署。 | 不证明旧手机 SW 一键更新、controllerchange、reload exactly once。 | 对部署身份非常高；对客户端更新体验覆盖有限。 |
| Browser/manual | 找到 RuntimeClient receiver、移动 Practice grid、玻璃不可见、Full Song blur 遗漏、View Transition 黑闪、空白和滚动问题。 | 历史上介入偏晚，很多问题在 tag/release 后才发现。 | 对本项目用户可见质量的单位时间价值最高。 |

## 3.1 真正捕获过的具体问题

### RuntimeClient receiver regression

`f149145` 新增 receiver-sensitive global fetch stub：

```ts
expect(this).toBe(globalThis)
```

旧实现把裸 `fetch` 存入实例字段，再以 `this.fetchImpl()` 调用，因此旧代码会让测试失败。该 test 不是普通 `vi.fn`，能真实复现浏览器 receiver 约束。

这是目前证据最强的“测试真正覆盖旧 bug”案例。

### Plan 36 targeted tests

保留日志显示：

- 一个 targeted run 因测试使用错误 URL scheme 失败并修复。
- 后续一个 Practice targeted run 失败后再通过。
- 这些测试在开发中提供了即时反馈，但现有记录不足以确定第二次失败是否对应真实产品 regression，不能计为已阻止生产 incident。

### PWA tests

每轮竞态修复都补充了大量测试：

- `d986a76`：+133 test lines。
- `84a9a93`：约 +42 test lines。
- `a308045`：+57 test lines。

这些 tests 对已知事件顺序有效，但每次仍有后一种未建模顺序逃逸。问题不是“完全没测试”，而是异步状态空间只按已发现顺序逐次扩展。

## 3.2 长期 PASS 但真机立即发现的问题

有直接证据的包括：

- RuntimeClient native fetch receiver。
- PWA 手机无法可靠发现/应用新版。
- Practice speed/play grid 顺序反向。
- 92% surface 使 glass 肉眼接近实心。
- Full Song 在移除共享 class 时遗漏 backdrop properties。
- native View Transition 在 iOS/PWA 黑闪。
- fixed 11rem reserve 产生大空白。
- 页面切段/主题切换滚动位置不稳定。

**结论**

当前自动验证对“类型、纯函数、文件输出、metadata identity”很强；对“真实浏览器 API receiver、移动几何、iOS compositing、视觉感知、已安装 PWA 生命周期”明显不足。后者恰好是后半程高返工的主要来源。

---

# 4. Quality Incident Database

| Incident | User-visible symptom | Original task / Plan | Commit(s) | Root cause | Plan problem? | Codex implementation problem? | Missing test? | Missing visual/manual verification? | Architecture problem? | Context/instruction problem? | Additional iterations | Could have been prevented earlier? |
|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| Native fetch receiver | App 报 `Runtime network while reading catalog.json`，但直接 URL 200 | Plan 05 / 真实内容导入 | 原 `08114cf`; 修复 `f149145` | 裸 `fetch` 被保存为实例方法，调用 receiver 变成 RuntimeClient | No | **Yes** | **Yes**，旧测试只注入普通 mock | **Yes**，真实浏览器最小复现才发现 | No | No | 1 | Yes：首版加入 receiver-sensitive native API test。 |
| PWA 长期停留旧版 | 手机 PWA 停在 1.2.3，仓库已 1.3.0，检查更新不稳定 | Plans 25–29 | `3fb5f7e`, `d986a76`, `84a9a93`, `a308045`, `cdc6698`, `3708d0b` | SW 生命周期、远端 probe、registration、部署 SHA、base URL 被分散建模 | **Partly** | Partly | **Yes**，缺完整 installed-PWA integration | **Yes** | **Yes** | Partly：早期 Plan 将问题局限于 manager | 至少 3 个额外 Plan | Yes：稳定阶段建立端到端更新链与真实部署 identity。 |
| Remote probe 先于 waiting worker | 点一次“立即更新”但 worker 尚未 waiting，流程停住 | Plan 25 → 26 | `d986a76` | `version.json` 和 worker installation 是不同速度的异步链 | **Plan 25 未完整覆盖** | Possibly | **Yes** | 真机验证缺失 | **Yes** | No | 1 | Yes：初始状态机区分 remote-known / worker-ready。 |
| Registration 到达更晚 | 立即点击更新后 `activationStarted` 锁死，registration 后到也不继续 | Plan 26 → 27 | `a308045` | 在 registration 未就绪时提前设置 started flag | **Plan 26 仍遗漏顺序** | **Yes** | **Yes** | Yes | **Yes** | No | 1 | Yes：事件序列模型或 model-based test。 |
| 发布成功但 production identity 未闭环 | CI 看似成功，手机实际请求到旧 Pages/probe | Plan 22/25 → 29 | `cdc6698`, `3708d0b`, `25fcd9d` | 双 workflow、`workflow_run` SHA 上下文、locationHref 推导 base、无线上回读 | **Yes，早期发布 Plan 不完整** | Partly | Yes | Yes | **Yes** | Repository harness | 1 个大重构 Plan | Yes：第一次 Pages 发布就校验 deployed version+SHA。 |
| Practice 控制器长期低质量/高返工 | 移动不可达、暂停语义、Strict Mode 失效、布局和控件多次变化 | Plans 11–36 | `4124273`, `a56d099`, `65a08f1`, `5b7d443`, `c1caafa`, `58385d3`, `598b384`, `2745bf3`, `895dfeb` 等 | 业务状态、播放会话、固定底栏、视觉系统长期在同一大型组件/CSS 中叠加 | Plans 多次改变目标 | **Yes，多个局部实现缺陷** | Partly | **Strongly yes** | **Yes** | 长上下文/多 Plan | 至少 8 个后续 Plan | 部分可防：先冻结移动控制器 contract，再扩展能力。 |
| Full Song 被统一 UI 改坏 | 已验证播放器结构、视觉和可达性退化 | Plan 34 → 35/36 | 引入 `598b384`; 恢复 `838f8e0`, `85c6a0f`, `72cd04a` | 全局 `control-sheet/control-button` 覆盖播放器独立 contract | **Yes，过度统一** | **Yes，未保护已有 baseline** | Yes | **Yes** | **Yes** | Plan 优先级促成机械执行 | 2 | Yes：visual regression + 明确 player-specific non-goal。 |
| Practice speed/play grid 被挤坏 | 三个速度按钮在窄列，播放按钮独占宽列 | Plan 35 → 36 | 引入 `2745bf3`; 修复 `895dfeb` | mobile grid columns 与 DOM 顺序相反 | No | **Yes** | **Yes，缺 geometry assertion** | **Yes** | No | No | 1 | Yes：检查 DOM order 对应列宽，375px 浏览器验收。 |
| 半透明反复无效果 | 有 blur CSS，但实机看起来近乎白色实心 | Plans 32–36 | `598b384`, `2745bf3`; 修复 `72cd04a` | Practice 被调到 92% surface；背景与 surface 本来接近；Full Song blur 属性迁移遗漏 | Plan 35 baseline 有矛盾 | **Yes** | CSS 字符串 test 不足 | **Strongly yes** | Partly：共享 class 耦合 | “半透明”只有文字标准，没有视觉基准 | 至少 2 | Yes：截图/像素差或实机验收，不以属性存在为 PASS。 |
| Practice 固定底部空白 | 每段末尾出现明显大空白 | Plan 35 → 36 | `2745bf3`; 修复 `895dfeb`, `b2871d0` | `--practice-dock-reserve: 11rem` 与真实 dock 高度无绑定 | Plan 35 未要求测量 | **Yes** | **Yes** | Yes | **Yes** | No | 1 | Yes：ResizeObserver/同源 token + short-content geometry test。 |
| Practice 地图反复重构后删除 | 地图先被加高、独立滚动，随后完全退出正文 | Plans 23、32、35 | `c1caafa`; 删除于 `2745bf3` | 产品方向从正文导航器改为底部 picker | **Yes，产品决策反转** | No direct bug | No | 用户体验验证可能过晚 | No | 长 Plan 未保存 durable rationale | 至少 2 次重做 | 只能通过更早 prototype/user validation 降低，不能完全避免。 |
| View Transition 黑闪 | Practice/Explain 切换出现黑/暗闪帧 | Plan 35 → 36 | 引入 `2745bf3`, `5998825`; 删除 `dd9d9db` | iOS/PWA snapshot compositing 与 native View Transition | **Possibly**：Plan 35 主动建议 API | **Yes**：在无真机证据下启用 | **Yes，jsdom 不覆盖** | **Strongly yes** | Browser-specific | 过度相信 progressive enhancement | 1 | Yes：默认关闭，真实目标设备通过后再启用。 |
| Practice/Explain 滚动不稳定 | 切段跳动、落在文章中部、页面乱滑 | Plans 23、32、35、36 | `a58daee`, `c1caafa`, `2745bf3`, `5998825`, `4cfe378` | 多入口分别操作 state/scroll；DOM replacement 与 browser scroll anchoring；策略反复改变 | **Partly** | Partly | Partly | **Yes** | **Yes** | 多 Plan 中语义变化 | 至少 3 | 可部分防：先定义每种 navigation source 的唯一 scroll contract。 |
| Theme 系统整体退役 | 已实现三 Theme 最终从产品消失 | Plan 08 → 23 | `82f1c47`–`cb638dd`; 删除 `53cd993` | 产品战略从多 Theme 转为单一浅色产品 | **Product decision reversal** | No evidence of implementation defect | No | 更早产品验证可能有帮助 | 过度建设 source/runtime visual contract | Context lacked durable product brief | 1 次重大重写 | 只能通过先做轻量视觉 prototype 降低投入。 |
| 曲库卡片多次重排 | 卡片紧凑、滑动操作、installed 状态连续变化 | Plans 28、30、32 | `7b03b19`, `d2afa16`, `a805702`, `a98b5e6`, `61fdcb5` | 信息层级和移动手势未在一次产品验证中冻结 | Partly | No single proven bug | Partly | **Yes** | App.css/shared catalog | 连续 Plan 迭代 | 至少 2 | 先用静态原型验证密度和 swipe affordance。 |

---

# 5. Plan Quality Analysis

## 5.1 有价值的 Plan 内容

### 明确产品语义

Plan 25 明确冻结：

- 用户必须主动点击更新；
- 不能改成无提示 `autoUpdate`；
- 不能清除 Resume、Timing Override 或歌曲下载；
- Settings 和全局 prompt 的职责不同。

这些约束直接保护用户数据与更新体验。

### 明确 non-goals 和边界

真实内容包 handoff 明确：

- `.private/`、audio、歌词、runtime 和 dist 不进 Git；
- 不在 ZIP 内开发；
- 不自动大改 provisional timeline；
- 只在发现公开缺陷时改公开代码。

这是项目特殊边界，价值很高。

### 明确 regression boundary

Plan 27 对一次点击更新列出了：

```text
registration late
→ installing
→ waiting
→ skipWaiting once
→ reload exactly once
→ timeout/retry remains valid
```

相比泛泛“修 PWA 更新”，它能直接转换成可靠 regression tests。

### 明确验收与根因

Plan 36 直接记录：

- grid 顺序反向；
- 92% opacity；
- Full Song backdrop migration omission；
- native View Transition 黑闪；
- 11rem 固定 reserve。

这是高质量 root-cause Plan，显著减少试错。

## 5.2 过度指定实现的模式

35 份 Plan 共 29,590 行。多个 Plan 不仅规定产品结果，还提前规定：

- 具体 hook：`useLayoutEffect`、`ResizeObserver`；
- 具体 helper 文件：`stable-context-transition.ts`；
- 具体 API：`document.startViewTransition()`；
- 具体 CSS grid 和 column 比例；
- 具体 DOM/class/data contract；
- 具体内部 state flags；
- 每 Phase commit message；
- 完整命令矩阵和部署流程。

这些内容中有些是高价值验收，但有些在未完整理解当前实现前锁定了局部方案。

## 5.3 A–D 案例

### A. Plan 指定方案明显帮助开发

1. **Plan 29**

   准确识别双 workflow、错误 base 推导、build SHA 上下文和缺少线上回读；方案与最终实现高度一致。

2. **RuntimeClient bug 指令**

   用户给出 receiver-sensitive stub 和正确修复形态。最终 `f149145` 是两文件 focused fix，测试能真实捕获旧 bug。

3. **Plan 36**

   以真实 main 的 CSS/DOM 为证据，避免继续猜测透明度、空白和 grid。

4. **真实内容导入 handoff**

   精确 hash、路径和 Git 边界有效避免了私有内容泄露。

### B. Plan 指定方案没有明显伤害

- Plan 27 提供 Option A / Option B，但允许等价实现；它约束的是状态语义，不强制唯一代码结构。
- Plan 08 对 deterministic art direction、单一 audio owner、无随机布局等约束本身工程质量较好。后来退役是产品方向变化，不代表这些实现约束错误。

### C. Plan 过度约束可能促成返工

1. **Plan 34 全局控件统一**

   明确要求整宽 bottom sheet 和统一控件语言。Plan 35 随即记录它覆盖了 Full Song 已验证 visual contract。

   这是目前因果证据最强的 Plan/UI 返工案例。

2. **Plan 35 View Transition**

   Plan 明确建议 `startViewTransition()` progressive enhancement，随后 Plan 36 确认它是黑闪路径并整体删除。

3. **Plan 35 的 92% baseline**

   同一 Plan 要求“真正可感知半透明”，又引用 92% surface 作为恢复基线。Plan 36 证明两者在当前配色下矛盾。

4. **Plan 23/32 地图**

   两个 Plan 对地图投入大量具体布局和滚动设计，Plan 35 又要求完全删除。这里更像产品决策反转，而非 Codex 单方面低质量。

### D. Codex 本应质疑但机械执行的案例

- 对“92% surface = 真半透明”应做颜色/实机判断，而不是只检查 `backdrop-filter` 是否存在。
- 对全局 `control-button` 套用成熟播放器，应先比较历史 baseline 并建立不可回归 contract。
- 对 native View Transition，应将目标浏览器验证作为启用条件，而不是仅依赖 feature detection。
- 对固定 `11rem` reserve，应质疑与真实可变 dock 高度的脱节。
- PWA 初版状态机应在实现前系统枚举事件排列，而不是只覆盖 `waiting` 正常路径。

---

# 6. Codex Behavior Analysis

## 6.1 无法证明的行为

以下没有完整命令历史，不能量化：

- 每个 Plan 具体读了多少无关文件；
- 总共重复运行了多少次 full test；
- 每次调查在“已有足够证据”后继续了多久；
- 总 token/context 消耗；
- 每次 CI/Pages 等待次数。

不能仅凭 Plan 长度断言 Codex 真的读了所有内容或执行了所有指定命令。

## 6.2 可以从结果证明的问题

### 对既有优秀实现理解不足

Plan 35 明确称 Plan 34 前 Full Song 为“真实使用验证过”的 baseline，并指出全局控件覆盖了它。这说明 Plan 34 执行时没有充分保护已验证实现。

### 重复实现而非先复用

Practice 控制器长期独立演化，Plan 35 最终要求以旧 Full Song 播放器为 canonical baseline 重新实现。至少在产品视觉/结构层面，复用判断介入过晚。

### 过度服从局部实现方案

- Plan 34 的全局统一直接落地。
- Plan 35 的 View Transition 直接落地。
- Plan 35 的 92% baseline 未被视觉结果否决。

这些更接近“模型缺少反驳/验证”，不只是 prompt 问题。

### 局部正确、整体失真

许多 CSS/test 可能在代码层面“满足指定属性”，但实机感知失败：

- 有 blur ≠ 看起来透明。
- 有 feature fallback ≠ iOS compositing 稳定。
- grid 有两列 ≠ DOM 顺序对应正确列宽。
- reserve 存在 ≠ 与 dock 几何一致。

## 6.3 做得好的任务

### RuntimeClient focused fix

- 只改实现和对应测试。
- 没碰 compiler、validator、private content、timeline、PWA。
- regression test 能复现旧 bug，而非形式化 mock。
- 是高质量 focused repair。

### 内容安全导入

从对话保留要求看，严格区分：

- 私有输入；
- public runtime generated output；
- Git ignored boundaries；
- provisional timing。

这类安全边界判断是项目中特别可靠的一部分。

### Plan 29 发布链

- 将代码、CI、Pages、probe、mobile update 作为完整链。
- 建立 version + commit identity。
- 生产 smoke 验证的是实际部署，不是“workflow 看起来正确”。

### Plan 36 根因修复

- 没继续随机微调 CSS。
- 对每个问题找到对应 DOM/CSS/property/state 根因。
- 删除不稳定新架构，而不是继续为其堆 workaround。
- 使用 targeted tests 迭代，并在 release boundary 执行完整验证。

## 6.4 模型、Plan、Harness 的责任区分

| 类型 | 代表问题 |
|---|---|
| 模型能力/实现问题 | fetch receiver、mobile grid 顺序、backdrop migration omission、92% 仍判作透明、固定 11rem。 |
| Prompt/Plan 问题 | Theme/地图/全宽 sheet 等产品方向快速反转；Plan 35 主动指定 native View Transition。 |
| Repository harness 问题 | jsdom 无真实 layout/compositing；无移动截图回归；无已安装 PWA 生命周期 E2E；CI compile/typecheck 重复。 |
| Context 问题 | 35 份外部 Plan、29,590 行；旧设计理由分散；任务常以“继续”推进，依赖长对话保持状态。 |

---

# 7. AGENTS.md Evaluation

分析对象是取证时工作树中的 `AGENTS.md`，包含进入取证前尚未提交的版本策略修改。

## 7.1 真正减少浪费的规则

应保留：

- “Follow the user's explicit request and explicit commands in a supplied Plan first.”
- Focused bug 使用真实 regression test。
- TypeScript 行为变化只运行一次 typecheck。
- UI 改动优先 related component tests 和有限 viewport。
- Library/PWA/release 检查按变更边界触发。
- `build` 已包含 compile/typecheck，不重复独立运行。
- 同一 invariant 不同时做重复自动/手工检查。
- 外部状态相同失败三次后停止。
- `.private/`、runtime generated、dist、Plan 文件不可提交。
- tag 指向真实用户实现 commit。
- 用户可见小 bug 可以是 PATCH，但不要求立即 push/deploy。

这些规则正好对应本项目已经发生的浪费和边界风险。

## 7.2 冗余或模型默认行为

可以压缩或移入通用 Skill：

- inspect Git status；
- implement smallest coherent patch；
- inspect final diff；
- do not scan whole repo；
- preserve unrelated warnings；
- concise completion report；
- do not rerun unchanged successful commands。

它们是良好 agent 默认流程，不完全需要在每个仓库重复展开。

## 7.3 项目特殊、必须留在 AGENTS 的规则

- 私有内容和 generated runtime 边界。
- Library validate/compile 与 content contract 的触发条件。
- PWA base-path build 和 inspect 的项目脚本语义。
- release ledger/tag/build identity 关系。
- RED:REPEAT 的 PATCH/no-version 分级。
- Plan、Phase、commit、push、version 非一一对应。
- production smoke 只在最终发布或 Plan 明确要求时执行。

## 7.4 应变成 Skill 的内容

通用 `frugal development` Skill 更适合承载：

- 风险分级验证；
- targeted test 策略；
- 避免重复 build/typecheck；
- browser viewport 最小矩阵；
- 外部状态重试上限；
- 简洁报告格式。

这样 AGENTS 可缩短为“项目特殊边界 + scripts semantics + release model”。

## 7.5 应放入 per-task Plan 的内容

- 本轮具体 viewport；
- 是否需要 Safari/iPhone；
- 是否执行 production smoke；
- 精确 acceptance matrix；
- 本任务禁止修改哪些模块；
- 特定 race 的事件顺序；
- 本次版本等级和 delivery boundary。

## 7.6 冲突与重复

1. “明确 Plan 优先”可能让超长 Plan 要求覆盖 AGENTS 的精简验证策略。这是刻意优先级，不是语法冲突，但会使效率规则失效。

2. PWA/build/release 三个 subsection 都部分描述 production verification，存在重复。

3. High-risk change 与各类别 verification 有交叉，可合并成“边界触发 + 高风险例外”。

4. 当前 release 规则比 HEAD 版本更准确，但 Git 历史存在不一致：

   - `v1.2.4` → `49e1fe3`，CI-only commit。
   - `v1.3.1` → `6197de9`，test-only commit。
   - `v1.6.0` → `7039a15`，test-focused commit。
   - `v1.6.1` → `4cfe378`，实际用户可见 fix commit。

   这说明新规则是对真实历史问题的修正，而不是抽象偏好。

---

# 8. Parallelization Opportunities

## 8.1 可并行的历史工作

### Investigation 并行

Plan 29 开始前可以并行收集：

- CI/deploy workflow 链；
- production `version.json`；
- client probe URL；
- update-manager 状态机；
- GitHub Pages 当前 SHA。

这些是不同证据源，最终统一归因即可。

### Plan 36 根因调查

可以并行检查：

- Practice DOM/grid；
- glass computed styles；
- Full Song property migration；
- View Transition 调用路径；
- reserve geometry；
- scroll source semantics。

调查只读且区域相对独立，适合并行；实现阶段则因 `App.css` 重叠不适合完全并行。

### 内容包处理

可并行：

- research/intake 文档审阅；
- archive 路径和安全边界审计；
- audio hash 预期核对准备。

必须在实际导入完成后串行运行 hash/validate/compile/build。

### Plan 23 大重构

冻结共享 contract 后，以下可分工作树并行：

- Theme/runtime contract retirement；
- Practice simplification；
- Full Song semantics；
- Explain/settings cleanup；
- docs。

但最终会在 `App.css`、`SongEditionPage`、tests 汇合，需要专门 integration pass。

### Plan 25 PWA

冻结 update-manager API 后：

- manager/state machine；
- UpdatePrompt；
- Settings controls；
- version-probe/build plugin；
- regression fixtures。

可以部分并行。

### Release tooling

实现完成后，可并行进行：

- release ledger consistency read-only audit；
- tag target audit；
- docs/changelog review；
- production URL readiness check。

真正写 package/release metadata 和 tag 必须串行。

## 8.2 不适合并行的任务

| 冲突区域 | 历史例子 | 原因 |
|---|---|---|
| `src/App.css` | Plans 28、30、32–36 | 71 次触碰；多个页面共用媒体查询和 control selectors。 |
| `PracticeWorkspace.tsx` | Plans 30、32、35、36 | 同时修改 state、DOM、scroll、dock geometry 会产生语义冲突。 |
| `update-manager.ts` | Plans 25–27 | race flags 和事件顺序必须作为一个状态机统一修改。 |
| shared schema/compiler | Plans 02/03/23 | source/runtime contract 需要原子迁移。 |
| Audio playback state | Plans 11–17 | session、range、repeat、speed 的生命周期互相依赖。 |
| release metadata | Plans 24–29、35/36 | package、ledger、tag target 和 build identity 必须串行确定。 |
| 全局控制器 class | Plan 34 | 并行修改各播放器会掩盖 global selector override。 |

---

# 9. Repository / Harness Quality

## 9.1 对 AI agent 友好的部分

### 模块边界

存在明确目录：

- `audio`
- `timeline`
- `library`
- `runtime`
- `practice`
- `edition`
- `pwa`
- `release`
- `debugger`

早期 contract/compiler/audio 的边界比后期 UI 更稳定。

### 测试

- 48 个测试文件。
- 323 个静态测试声明。
- Library、PWA、edition 各有相对集中测试。
- RuntimeClient receiver regression 是高质量浏览器语义测试。

### Scripts

仓库已有一等脚本：

- `library:validate`
- `library:compile`
- `library:audio-hash`
- `repo:hygiene`
- `release:verify`
- `release:smoke`
- `pwa:inspect`

这些命令为 agent 提供了清晰、可重复的验收入口。

### Release tooling

Plan 29 后建立：

- exact build SHA；
- package/release/version identity；
- fixed production endpoint；
- deploy 后线上回读。

这是仓库较成熟的部分。

### 私有/生成文件边界

取证时 `.private/`、`public/library-runtime/`、`dist/` tracked 数为 0，说明边界实际有效。

## 9.2 不友好的部分

### `App.css` 过度集中

- 当前 3,742 行、77 KB。
- 历史 71 commits，+6,081 / -2,339。
- Practice、Full Song、Explain、Catalog、PWA prompt 和全局 controls 共享 selector 空间。

这使 AI 很难确定一个 CSS 修改的真实影响范围。

### PracticeWorkspace 责任过多

当前 538 行，但历史 churn 超过 5,200 行，曾同时管理：

- unit selection；
- playback；
- rate/repeat；
- map/picker；
- scroll；
- fixed dock；
- range editing；
- ramp/shadow；
- resume。

它是高返工的结构性中心。

### jsdom 与真实 UI 差距

现有测试可断言 class/DOM/state，但无法可靠验证：

- fixed layer 的实际高度；
- grid 列是否视觉合理；
- backdrop 是否肉眼可见；
- iOS safe area；
- View Transition compositing；
- Safari PWA。

### CI 重复

一次 main push 运行五次 compiler、四次 typecheck。正确性边际收益低于成本。

### Plan 外置且缺少 durable rationale

Plan 位于临时目录，不在仓库中。项目能看到“现在是什么”，但不容易知道：

- 为什么 Theme 被删除；
- 为什么播放器不应使用全局控件；
- 为什么 Practice 地图被删除；
- 为什么禁用 native View Transition；
- PWA state machine 的完整事件模型。

### 版本/tag 语义历史不一致

部分版本 Tag 指向 test/CI commit，而非用户实现 commit。取证时 AGENTS 已尝试修正，但历史 ledger 仍反映旧策略。

## 9.3 如果第一天就存在，可明显降低后期成本的设施

1. Practice/Full Song 的组件级视觉回归截图。
2. 固定 375×812、393×852、430×932、1280×800 的 geometry assertions。
3. 可安装 PWA 的浏览器 E2E，覆盖 old build → new build。
4. Service Worker event-sequence/model-based tests。
5. production `version + commit` smoke，从第一次 Pages 部署就建立。
6. CSS modules/layers 或按 workspace 分离样式，减少 `App.css` 全局覆盖。
7. Player-specific visual contract tests，禁止 global class 覆盖核心结构。
8. 一份短的 durable Product Brief/ADR。
9. CI 将 typecheck/compile 与 root/base bundle 解耦。
10. 原生浏览器 API wrapper tests，包括 receiver、AbortSignal 和 base URL。

---

# 10. Prototype vs Stabilization vs Production

## Prototype

应完成：

- source/runtime contract 的最小版本；
- Library compiler；
- AudioEngine 与 Timeline resolver；
- 单首真实/合成 Song Edition；
- 最小 Practice、Full Song、Explain；
- 简单 PWA shell；
- 内容私有边界；
- Timeline Debugger 基本能力。

不应在这一阶段重投入：

- 三套完整 Theme runtime contract；
- PWA 一键自更新状态机；
- release ledger 的复杂 tag 策略；
- 多轮全局控件统一；
- 精细 production smoke。

Prototype 的重点应是验证：

- 用户是否真的需要 Theme；
- Practice 的核心学习闭环；
- 地图还是 picker 更好；
- Full Song/Practice 是否应共享视觉。

## Stabilization

应完成：

- 真实歌曲输入；
- 移动 Practice/Full Song layout；
- playback/range/rate/repeat 边界；
- resume migration；
- scroll/navigation contracts；
- offline song cache；
- visual regression；
- Safari/iPhone/PWA manual matrix；
- Service Worker 更新状态机；
- version probe；
- worker-ready / registration-late / timeout/retry tests。

### PWA 自更新应在何时建立

**RECOMMENDATION**

应在 Stabilization 中期建立，而不是最早 Prototype，也不应拖到最终 Production 发布后。

前提是：

- app shell/base path 已稳定；
- 离线内容模型已稳定；
- 版本 metadata 来源已唯一；
- 有真实已安装 PWA 测试环境。

这样可以在 Production 前经历至少一次真实 old-build → new-build 演练。

## Production / Release

应完成：

- release ledger；
- semantic version；
- tag target audit；
- exact tested SHA deployment；
- package/ledger/tag/build identity；
- fixed production probe；
- deploy 后 production smoke；
- Pages artifact retention；
- old installed PWA upgrade test；
- rollback/failed-update behavior。

### version probe / deployment identity verification

应从第一次正式公开发布前就具备。Plan 29 才补齐它，导致此前“workflow 存在”被误当成“线上已经是当前版本”。

---

# 11. Conversation / Context Problems

## 11.1 上下文长度

**MEASURED**

- 35 份 Plan，29,590 行。
- 最大单份 Plan 2,144 行。
- 对话连续跨越 Plan 01–36，并多次以“继续”推进。
- 中间有多次“暂时暂停/继续未完成部分”。

这必然增加：

- 旧设计原因丢失；
- 当前 main 与 Plan 写作时 baseline 不一致；
- 新任务机械沿用旧概念；
- Agent 依赖对话压缩摘要。

## 11.2 重复解释

多个 Plan 反复要求：

- “执行前以当前 main 为准”；
- 不要相信 Plan 中旧 SHA；
- 不修改 `.private`；
- 指定整套 lint/typecheck/test/build/release 命令；
- 每个 Phase focused commit。

这些说明 durable repository guidance 不足，导致每个 Plan 重复携带执行 harness。

## 11.3 历史决策丢失的具体例子

- Plan 34 没有充分保留“Full Song 独立 visual contract 已经实机验证”的理由；Plan 35 才重新声明。
- Plan 32 把地图视为核心导航器；Plan 35 删除时没有仓库内 ADR 记录为什么产品方向改变。
- Plan 35 引入 View Transition；Plan 36 才记录其 iOS 黑闪风险。
- Theme 系统从“v1 主体完整状态”变为整体删除；该战略转向主要存在于临时 Plan，而非 durable product brief。

## 11.4 信息应放在哪里

### Repository docs / ADR

长期保存：

- 产品模式：Practice / Full Song / Explain 的职责；
- player-specific visual contract；
- scroll/navigation semantics；
- Theme 退役决定；
- map → picker 决定；
- PWA event/state model；
- release/tag identity model；
- private/generated boundaries。

### AGENTS.md

只保存：

- 仓库特殊安全边界；
- scripts 的适用条件；
- release/version/tag 规则；
- Plan 优先级。

### Skill

保存通用：

- focused workflow；
- risk-proportional verification；
- targeted tests；
- browser viewport 策略；
- 避免重复检查；
- 报告格式。

### Project Brief

保存：

- 产品核心用户和价值；
- 当前 v1 模式；
- 明确不存在/已退役的能力；
- canonical UI baseline；
- 移动优先原则。

### Per-task Plan

只保存：

- 当前问题和证据；
- 本轮范围/non-goals；
- acceptance criteria；
- 相关文件；
- 特殊验证；
- delivery boundary。

### 不应长期保存

- 临时命令输出；
- 已经关闭的 Phase checklist；
- 完整 commit message 模板；
- 每次重复的 npm 命令；
- 过时 SHA；
- 实现完成后无价值的逐步操作叙述。

---

# 12. Raw Evidence Appendix

## 12.1 Commit range

```text
First:
d4a56acfb5d05ee96c67dbfcd41c079b9a09c604
2026-08-18T02:05:50+08:00
chore: 初始化 React TypeScript Vite 工程

Latest:
1a8784eceb8a93ceb32b1d240326d390e9845aed
2026-08-25T19:00:55+08:00
chore: record 1.6.1 release metadata
```

## 12.2 Commit prefix counts

```text
feat       84
fix        33
chore      20
test       14
refactor   11
docs        6
ci          4
practice    4
catalog     3
style       3
ui          3
pwa         2
explain     1
release     1
```

## 12.3 Tag index

```text
v0.1.0  fc4a9c2  feat: 建立 Liner Song Edition opening
v0.1.1  ed4573e  fix: 收敛 Song Edition consumer 状态边界
v0.2.0  2e808d5  feat: 完成 Timeline Debugger 导出工作流
v0.3.0  cb638dd  style: 完成三 Theme 响应式与无障碍整合
v0.3.1  eb405aa  fix: 收敛 Theme identity 与 compact overflow
v0.3.2  6a04fa7  fix: 收敛 EOF completion 与 Theme identity
v0.4.0  57bb840  feat: 完成学唱纵向切片集成
v0.4.1  4124273  fix: 修正学唱移动布局与暂停继续语义
v0.4.2  a56d099  fix: 修复严格模式下学唱会话失效
v0.5.0  a5c8f48  feat: 增加个人微调管理与冲突处理
v0.6.0  8c0fa85  feat: 增加全曲播放器与学习段跳转
v0.6.1  4b2c3e7  fix: 让移动端全曲播放器首屏可达
v0.6.2  da13211  fix: 修正全曲歌词触摸跟随语义
v0.7.0  169986c  feat: 接入讲解工作台垂直切片
v0.8.0  8365396  refactor: finish Chinese product shell
v0.8.1  9294ca5  fix: recognize legacy practice resumes
v0.8.2  5acedff  fix: separate legacy resumes from recent learning
v0.8.3  e579d61  fix: keep full song player visible on desktop
v0.9.0  3d7e053  feat: refresh MyKr brand and app icons
v0.9.1  e95ad0b  fix: keep full song tabs above player
v1.0.0  4f9ebd1  release: publish 1.0.0
v1.1.0  386fdbe  feat: regroup changelog by milestones
v1.2.0  4a8b5b6  feat: add global PWA update prompt
v1.2.1  e9e1ca9  feat: add settings update controls
v1.2.2  cad4665  fix: preserve downloaded runtime state
v1.2.3  8eaf6e6  fix: keep version checks responsive
v1.2.4  49e1fe3  ci: verify release ledger
v1.2.5  84a9a93  fix: complete PWA worker activation
v1.2.6  a308045  fix: wait for PWA registration before activation
v1.3.0  7b03b19  refactor: compact catalog song cards
v1.3.1  6197de9  test: keep update probe version scenarios distinct
v1.4.0  5e37fae  practice: name compact dock rows
v1.4.1  61fdcb5  catalog: lighten installed state
v1.4.2  58385d3  ui: refine practice and explain controllers
v1.5.0  598b384  ui: unify control surfaces and bottom sheets
v1.6.0  7039a15  test: cover stable player navigation paths
v1.6.1  4cfe378  fix: reveal practice units at stable offset
```

## 12.4 Key reversal diffs

```text
53cd993 refactor: retire theme and visual contract
41 files changed, 39 insertions, 2366 deletions

c1caafa practice: refresh floating dock and map navigation
3 files changed, 118 insertions, 24 deletions

2745bf3 fix: rebuild practice segment controls
6 files changed, 641 insertions, 332 deletions
- removes old map implementation
- adds PracticeSegmentPicker
- adds stable-context-transition utility

598b384 ui: unify control surfaces and bottom sheets
15 files changed, 176 insertions, 40 deletions

838f8e0 fix: restore compact full song player
4 files changed, 75 insertions, 56 deletions

dd9d9db fix: remove unstable workspace view transitions
5 files changed, 4 insertions, 105 deletions
```

## 12.5 PWA change scale

```text
3fb5f7e feat: add PWA update manager
8 files changed, 632 insertions, 9 deletions

d986a76 fix: wait for PWA worker before activation
2 files changed, 265 insertions, 17 deletions

84a9a93 fix: complete PWA worker activation
3 files changed, 111 insertions, 6 deletions

a308045 fix: wait for PWA registration before activation
2 files changed, 62 insertions, 1 deletion

cdc6698 ci: verify Pages deployment identity
4 files changed, 231 insertions, 62 deletions

3708d0b pwa: harden build identity probing
5 files changed, 112 insertions, 11 deletions
```

## 12.6 RuntimeClient regression diff

```text
f149145cb58b59e8584eb9b9e0a9ca20f4eb4b41

Old:
this.fetchImpl = options.fetchImpl ?? fetch

New:
this.fetchImpl =
  options.fetchImpl ??
  ((input, init) => globalThis.fetch(input, init))

Regression assertion:
expect(this).toBe(globalThis)
```

Relevant files:

- `src/runtime/runtime-client.ts`
- `src/runtime/runtime-client.test.ts`

## 12.7 Hotspot files

```text
src/App.css                             71 commits  +6081 -2339
src/edition/PracticeWorkspace.tsx       26 commits  +2886 -2348
src/edition/PracticeWorkspace.test.tsx  26 commits  +2075 -1562
src/App.test.tsx                        24 commits  +923  -101
src/edition/SongEditionPage.test.tsx    22 commits  +1031 -742
src/App.tsx                             20 commits  +1072 -270
src/release/releases.ts                 19 commits  +483  -36
src/edition/FullSongWorkspace.tsx        9 commits  +767  -148
src/pwa/update-manager.test.ts          12 commits  +462  -40
```

Current sizes:

```text
src/App.css                         3742 lines
PracticeWorkspace.tsx               538 lines
FullSongWorkspace.tsx               619 lines
update-manager.ts                   543 lines
.github/workflows/ci.yml            129 lines
AGENTS.md                            98 lines
```

## 12.8 GitHub Actions IDs

```text
CI #1   32053856833  31e10f7  21s
CI #2   32057522655  8023979  27s
CI #3   32065575663  1ece67e  32s
CI #4   32129704892  c8754f4  35s
CI #5   32140569027  1c778ca  44s
CI #6   32147695835  a12aac3  44s
CI #7   32243248132  1668e6d  56s
CI #8   32247274736  eb405aa  54s
CI #9   32250998975  ac61b56  54s
CI #10  32258824731  3b6421c  61s
CI #11  32263465221  f149145  47s
CI #12  32365440512  57bb840  62s
CI #13  32370302127  4124273  65s
CI #14  32390717607  a56d099  72s
CI #40  32840230395  1a8784e  123s
```

Selected links:

- <https://github.com/MyKr-YSteinsK/red-repeat/actions/runs/32263465221>
- <https://github.com/MyKr-YSteinsK/red-repeat/actions/runs/32390717607>
- <https://github.com/MyKr-YSteinsK/red-repeat/actions/runs/32840230395>

## 12.9 Plan corpus measurements

```text
Plan files: 35
Total lines: 29,590
Average: 845.4
Median: 717
Maximum: 2,144
Missing sequence: Plan 31
```

Largest known Plan:

```text
RED-Plan-23-1.0学唱简化与产品模式收口.md
2144 lines
```

## 12.10 Repository state at forensic collection

```text
Branch: main

git status --short:
 M AGENTS.md

git diff --stat:
 AGENTS.md | 19 ++++++++++++++-----
 1 file changed, 14 insertions(+), 5 deletions(-)

Tracked protected/generated paths:
.private/               0
public/library-runtime/ 0
dist/                   0
```

该 `AGENTS.md` 修改在取证前已经存在；取证过程没有改变其内容或 Git 状态。
