# 历史归档摘要

本轮保留从正式决策、实现与验收恢复上下文所需的信息。迁移前的源码和旧文档仍可按 Git 提交读取，
待手动清理的本机原件放在 `docs/delete/`，保留迁移前相对路径。这里的观察按当时的版本和环境使用。

## 演进与可复用结论

| 边界 | 历史结果与教训 |
| --- | --- |
| 初期到 RED-Plan-37/44 | 产品从多 Theme、正文内练习地图、复杂训练矩阵收敛到三模式和紧凑的 Segment Picker。原生 View Transition 在 iOS/PWA 有黑闪记录。Full Song 保有自己的控制层，固定层和返回滚动以实际设备检验。 |
| RED-Plan-45–57 | 逐曲获批的源包进入 `library/`；保留原文、逐字 Ruby 和译文层。D-020 引入 Provisional / Calibrated 两阶段。D-021 合并旧内容与播放 timing 字段，D-022 建立完整逐曲下载快照。批量源验收和人耳核验各自记录。 |
| RED-Plan-58–64 | D-023 固定当前会话 build 并自然采用下一版；纠正连续播放高亮回跳。补齐六曲一版目录。旧内容、台账和实机证据按交付身份查看。 |
| RED-Plan-65–75 | Warm-entry 先确认 manifest，Core 与可选 Feature 拆分，同曲跨模式与 Explain 临时试听交给歌曲级 owner。新增显示偏好、最近位置、手动待练、个人备份、下载进度、公开 Timing 入口和文章内定位。进度拖动优化仅证明指定路径的 seek/播放写入下降，尚无普适性能预算。 |
| RED-Plan-76–80 | 当时审查了 46 篇 Feature 和 240 个 Segment。Unicode Feature ID 恢复问题在 Plan-77 修正。D-028/Plan-78 保全严格身份下的 sparse v3 Timing；兼容路线 B 仍待决定。Plan-79/80 的 WORK 审稿是候选证据，实际集成范围按之后的 Plan-82。 |
| RED-Plan-82、84、86、88、90、92 | 逐曲集成已审定文章与部分译文，HOLD 保持原值。对应产品提交为 `c0ac7a4`、`71d2bec`、`c8cddbe`、`e2c3084`、`1214291`、`a57bc49`。多个独立浏览器案例验证 H2 资源失败时保留 H1；能否套用旧本地 Timing 按完整 identity。 |

历史发布版本和实现提交以 `src/release/releases.ts`、tag 和[版本发布规范](../版本发布规范.md)为准。
源校验、文章 parser、快照事务、JS 构建与人耳判断覆盖不同问题。
早期取证记录已经发生的移动几何和周期性发布返工。超过当前授权的变更通过小范围复现和真实设备证据评估。

## 可追溯的听感范围

- `Ｗ●ＲＫ` RED-Plan-37 的历史 `PASS 40` 包含 `o001`、`o009–o020`、`o029–o037`、
  `o042–o057`、`o061` 与 `instrumental` 边界。音源 SHA-256
  `facc3031bda3d4c5588276fd33b46c9474d19af3364880f9ca1567cea4928083`。适用范围按历史记录使用。
- `千本桜` RED-Plan-49 历史校准覆盖 45 个 Occurrence、82 个旧播放字段。
  RED-Plan-53 将其迁入单一 canonical 区间；听感记录对应原来的校准覆盖。
- 用当前音频、Timeline 和任务指定的实际听感证据确认新的 `Calibrated Timing`。旧报告中的
  概略听感、静态图和合成浏览器证据按记录边界使用。

## 原始材料定位

| 旧路径 | 保留内容 |
| --- | --- |
| `docs/project/PROJECT_BRIEF.md`、`DECISIONS.md` | 原需求与 D-001–D-028 全文。现行提炼见[项目合同](PROJECT.md)。 |
| `docs/project/CURRENT_STATE.md`、`SUPPORTING_DOCS_MANIFEST.md` | Plan-37–92 验收细表、版本快照、旧 owner 列表和历史待观察项。现行入口见[状态](STATUS.md)和[运行手册](RUNBOOK.md)。 |
| `docs/project/CONTENT_QUALITY_BASELINE.md` | 各曲原文／译文／读音／引用的首轮审查与风险研究。重做内容任务前读取相关历史段落，按当前源复核。 |
| `docs/archive/migration/RED-REPEAT-Development-Forensics-2026-08-26.md` | 早期项目取证、工程用时证据和观察边界。 |
| `docs/project/WORK_CONTENT_REVIEW.md` | 在旧入口保留的独立工作稿。以各自已批准源包和当前 Canonical Library 判定实际状态。 |
| 原工作区本地复盘与 `docs/reviews/` | 仍是本地证据。保留原文件，可在新任务核对旧现象是否仍可复现。 |

退役受版本控制的材料可从原基线读取。例如：

```sh
git show 'cfa91fb4a7b062feac725ba9c1d82b545fa4059b:docs/project/CURRENT_STATE.md'
```

本轮退役的源码是 `use-practice-controller.ts`、`practice-controller.ts`、
`practice-playback-session.ts`、`catalog-resume.ts`、`runtime-cache.ts`、
`playback-ranges.ts` 及四份专用测试。已核对当前生产及 dev 入口和现有剩余测试的引用。
现有歌曲级播放、Workbench 区间、持久化恢复、下载和 Workbox 路由由
[运行手册](RUNBOOK.md)中的活动 owner 继续负责。
