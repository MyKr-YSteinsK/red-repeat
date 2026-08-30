# DECISIONS

Durable decisions are recorded here when code alone cannot explain the product
boundary. Historical Plans and archived evidence do not override them.

## D-001｜Keep RED:REPEAT a focused personal Song Edition PWA

- Status: Accepted
- Source: `USER_DECISION`

RED:REPEAT centers on learning, listening, understanding and returning to songs.
It is not a general language-learning, streaming, media-management,
social/community, account/cloud-sync or multi-user platform. Static/local-first
architecture is intentional; a future server authority requires a new explicit
product goal.

## D-002｜Three Song Edition modes are the product shell

- Status: Accepted
- Source: `USER_DECISION` + `REPO_FACT`

Keep Practice (default), Full Song and Explain as separate surfaces for learning
controlled ranges, continuous listening and contextual understanding. They may
share Song Edition/audio/timing data, but each workspace retains a coherent UX
contract. This supersedes older Focus/Immersive/Shadow-like product modes.

## D-003｜Retire multi-Theme runtime and per-song visual packs

- Status: Accepted
- Source: `USER_DECISION` + historical reversal confirmed by current repo

Use one restrained product visual language. Do not restore Liner/Cinema/Nocturne,
ThemeSwitcher or `visual.json`-driven runtime themes. The system was implemented
and then deliberately removed because its contract and maintenance cost did not
support the core product. Old visual material is archive evidence only.

## D-004｜Simplify Practice training controls

- Status: Accepted
- Source: `USER_DECISION`

Keep controlled rate, normal line playback, continuous playback and ramp
behavior. Do not restore the older Target × Method, Shadow or arbitrary
repeat-count matrix as routine UI; high-frequency practice should remain
low-friction.

## D-005｜Replace the body-level Practice map with Segment Picker navigation

- Status: Accepted
- Source: `USER_DECISION` + historical reversal + current repo

Practice navigation is previous segment / current Segment Picker / next segment.
The picker is controller-adjacent and layered above content because the body map
consumed lyric space and created a fragile second scrolling model. Old map Plans
are archive-only unless new user evidence creates a new decision.

## D-006｜Protect Full Song as a player-specific visual baseline

- Status: Accepted
- Source: `USER_DECISION` + historical real-use acceptance

Full Song structure and material behavior are locally owned. Shared tokens are
allowed, but global control classes must not override its validated mobile
player geometry, primary action, reachability or translucency. Real-use evidence
outranks abstract global uniformity.

## D-007｜Do not use native View Transition as the default workspace switch

- Status: Accepted
- Source: `USER_DECISION` + target-device failure + current repo

Practice/Explain changes use deterministic state and scroll policy, not native
snapshot View Transition for correctness. It caused black/dark flashes on target
iOS/PWA behavior. Feature detection or desktop success is not enough to restore
it; new target-device evidence would be required.

## D-008｜Compiler owns generated runtime resources

- Status: Accepted
- Source: `REPO_FACT` + durable engineering rationale

Tracked `library/<song-id>/` is canonical public source. Validator/compiler
produces deterministic hash-addressed ignored `public/library-runtime/`, while
`dist/` is a build artifact. Generated files are replaceable outputs, never
hand-maintained authority.

## D-009｜Keep public source and private research as different domains

- Status: Accepted
- Source: `REPO_FACT` + historical reversal

Approved public source, including approved public audio/lyrics, may live in
tracked `library/`; `.private/` remains ignored private research, provenance and
pending intake. The earlier blanket rule that complete lyrics/audio could never
enter Git is superseded. Each intake requires an explicit domain decision.

## D-010｜Model Segment, Occurrence, Section and Practice Unit explicitly

- Status: Accepted
- Source: current source contract + durable engineering rationale

Segment is reusable lyric/content material; Occurrence is a timed performed
position; Section is musical structure; Practice Unit is a teachable grouping.
Keeping them separate avoids duplication and prevents musical structure from
being fragmented solely to fit a mobile practice page.

## D-011｜Editorial timing and playback timing are independent intervals

- Status: Superseded by D-021
- Source: `USER_DECISION` + HEAD `c61f977` source/schema change

The former contract kept `startMs/endMs` for editorial/highlight timing and
`playStartMs/playEndMs` for transport/practice timing. It was replaced by D-021;
the old field names remain here only as historical decision evidence. Do not
restore the dual-field model.

## D-012｜Keep canonical timing and personal overrides separate

- Status: Accepted
- Source: `USER_DECISION` + current implementation

Canonical timing is compiled/distributed source. Personal corrections are sparse
overlays on the same `startMs/endMs` fields, bound to song/content/audio/timeline
identity. Incompatible overrides invalidate rather than mutate canonical source;
legacy timing override schemas are cleared when compatibility cannot be proven.

## D-013｜Treat PWA update as event ordering plus two identity questions

- Status: Accepted
- Source: `USER_DECISION` + incident/root-cause evidence + current repo

Update logic must model remote discovery, registration, installing/waiting worker,
activation, controller takeover and natural next-launch adoption with bounded
failure handling. A production probe answers what was deployed; an installed-
client check answers whether an old client can discover/activate it. A single
boolean is not enough, and business data must survive updates. An updater-driven
reload or `SKIP_WAITING` takeover is not a normal current-session step; the
current document remains pinned to its startup build.

## D-014｜User version is independent from Plan/commit count

- Status: Accepted
- Source: `USER_DECISION` + release docs/tooling + current workflow

Semantic user versions describe user-visible change. `src/release/releases.ts`
is the ledger, and a final release boundary requires package, ledger, build, tag
and deployed identity coherence. A successful `main` push can deploy through the
single workflow, so “batching” cannot be described as if `main` were non-
deploying. New tags should point to the user-visible implementation commit;
historical inconsistencies are recorded, not rewritten.

The former `c61f977` / `1.6.1` migration caveat was resolved by RED-Plan-38:
`1.6.2` / `v1.6.2 -> c61f977`, with deployed build identity tracked separately.

## D-015｜Use one audio lifecycle owner across song workspaces

- Status: Accepted
- Source: durable repository engineering rationale

Song workspaces share the intended audio-engine/playback ownership model. Local
UI changes should use the shared playback abstraction; competing media owners
would create rate, range, cleanup and cross-workspace race problems.

## D-016｜Real-device and human evidence are part of acceptance

- Status: Accepted
- Source: `USER_DECISION` + incident evidence + current risk model

Automated tests remain necessary but cannot prove iOS/PWA geometry, safe area,
touch, scroll, compositing/perceived translucency, installed Service Worker
lifecycle or audible timing cuts. Plans must choose a matching browser/device or
human oracle. More DOM assertions do not close a real-device or perceptual
failure. The forensic migration report's incident analysis was extracted into
these decisions and the current-state risk register before archival.

## D-017｜Make Timing Debugger a production-public supporting capability

- Status: Accepted
- Source: `USER_DECISION`

The Timeline/Timing Debugger is a formal RED:REPEAT product capability and may
be used in production. The current public product entry is the Settings
surface leading to the static-safe `#timing=debug` route; this is a supporting
capability alongside, not a fourth replacement for, the Practice, Full Song and
Explain Song Edition shell.

The capability covers timing inspection, audio audition, calibration through
identity-bound local timing overrides and export. Future routing cleanup,
production hardening or debug-code pruning must not hide or remove it merely
because its implementation is named `debugger`; that requires a new explicit
user decision. D-011 and D-016 remain in force: public access does not bypass
source validation, audio/timeline/Edition identity checks, canonical-source
review, or the required human/audio evidence.

## D-018｜Keep canonical Japanese lyrics and add position-verifiable ruby

- Status: Accepted
- Source: `USER_DECISION` + RED-Plan-44

Japanese `Segment.lyrics` remains the canonical original text, including its
original 字形、标点、大小写和必要空格。Furigana is an additional `ruby` span
contract, not an HTML/JSX replacement for the source lyric. Each span carries a
half-open position, exact `base` substring and Hiragana `reading`; the source
validator rejects range errors, overlap, base mismatch, missing Han/Katakana
coverage and invalid readings. Semantic spans may cover okurigana, jukujikun or
special readings without requiring per-character decomposition.

The compiler carries ruby data into Runtime. User-facing lyric rendering uses
semantic `<ruby>/<rt>` while preserving the canonical original for accessible
names, copy-oriented semantics, playback selection and lyric references. The
existing `layers` contract remains backward compatible. Ruby and content
changes do not authorize Timeline/audio timing edits.

## D-019｜常规真人验收作为部署后观察｜Routine Real-use Checks as Post-deploy Observation

- Status: Accepted
- Source: `USER_DECISION` + RED-Plan-44 Closeout

对 RED:REPEAT 的常规 UI、内容、歌曲 source、普通交互和低风险维护，匹配
边界的自动化/本地验证通过后即可视为开发完成并进入 Production 交付。真实
设备、听感、PWA 实际使用等无法自动证明的属性，不再默认作为阻塞 commit/push
的 USER CHECK；它们作为 `POST-DEPLOY OBSERVATION`，在用户正常使用中发现
问题后再开 focused fix Task。

D-016 继续有效：自动化证据不能被描述成已经证明 iOS/PWA 几何、听感、触控、
compositing 或其他真实设备/感知属性。只有高风险、不可逆、数据/identity/PWA
lifecycle 变更，当前 Plan 明确要求真人 gate，或问题无法安全部署后发现时，
USER CHECK 才作为 `BLOCKING USER CHECK`。这项策略不减少匹配边界的自动化验证
要求，也不取消必要的真实证据。

## D-020｜新曲采用 Provisional → Calibrated 两阶段 timing lifecycle

- Status: Accepted
- Source: `USER_DECISION` + `RED-Plan-46`

新 Song Edition 首次进入 Production 时，可以使用 `Provisional Timing`：以已
验证的 canonical audio identity、LRC/歌词 anchor、轻量音频检查和结构性约束，
建立足够可用的初始 timing。每个 Occurrence 必须有有效的
`startMs/endMs`；Provisional Timing 不得包含明显
跨句清晰音节、错误的长 intro/间奏/outro 归属、机械的 fixed padding 或
`end = next LRC timestamp`。它可以保留几十到几百毫秒级的后续精调空间，但
不得被描述为 human audible PASS 或最终校准完成。

用户随后通过 Production Timing Debugger 在真实使用中校准 correction package
所覆盖的唯一 `startMs/endMs`。与当前 song、Edition、
audio 和 Timeline identity 匹配的 `Timing Correction Export`，由 Codex 作为
focused canonical timing correction 合入 source；只修改导出覆盖的 timing
与必要的 matching notes，经过 validation/build 后发布。未被用户实际校准的
Occurrence 不得虚构为 `Calibrated Timing` 或 human PASS。

D-012、D-016 与 D-019 继续有效；Provisional 不降低 audio identity、
gross structure、obvious leakage 或 source validation 门槛；local override
不能直接突变 canonical source；identity mismatch 的 correction 不得合入；
自动化和静态证据不能伪装成 audible timing 或真实设备验收。

## D-021｜Occurrence 使用单一 authoritative timing interval｜Single Authoritative Occurrence Timing

- Status: Accepted
- Source: `USER_DECISION` + `RED-Plan-53`

一个 Occurrence 只拥有唯一的 `startMs/endMs` 区间。该区间同时驱动
resolver/current/highlight、Practice 单句与连续范围、Full Song、Explain
试听、Timing Debugger audition/export，以及未来的 canonical timing merge。
`Section.startMs/endMs` 仍独立表示音乐结构，不是 Occurrence 的机械容器。

迁移双 timing source 时，原 `playStartMs/playEndMs` 是迁移赢家，用于覆盖旧
`startMs/endMs`；迁移完成后旧字段不再属于 active source/schema/runtime
contract。local override 只能以 sparse `startMs?` / `endMs?` 表达同一 timing
的临时覆盖；无法在完整 song/Edition/audio/Timeline identity 下证明兼容的旧
override 必须 invalidate/clear。Timing Correction Export 只输出单一 pair，
不得再次形成 playback-only 的第二真值。

## D-022｜已下载歌曲使用 identity-coherent 本地快照｜Downloaded Songs Use Identity-coherent Local Snapshots

- Status: Accepted
- Source: `USER_DECISION` + `RED-Plan-57`

“已下载”只在一个 Song Edition 的完整本地快照通过身份与资源完整性验证后
成立。active snapshot 以 `songId`、`contentHash`、精确
`CatalogEdition` 和 exact resource set 绑定；前台 Catalog 与已下载歌曲读取
优先使用本地可用数据，网络 freshness 只在后台进行，不得进入已下载内容的
交互关键路径。

内容从 H1 更新到 H2 时，H1 必须保持 active，直到 H2 全部资源成功、schema/
identity 验证通过并以 manifest-last 方式原子切换。失败的 H2 staging 只清理
本轮新增资源，不删除最后一个完整 H1；Catalog 已指向 H2 但 H2 不完整或离线
时，仍使用 manifest 内保存的 H1 `CatalogEdition` 打开完整 H1。v1 download
manifest 在完整且可验证时原地迁移到 v2，不无理由删除用户下载。

Workbox immutable Runtime 与 audio Range route 可以向共享 snapshot cache 写入
资源，但只有有效 manifest 定义 active installed snapshot；`practice.<hash>.json`
属于必须覆盖的 immutable structured Runtime。Catalog 使用本地先行的
stale-while-refresh 语义。Service Worker activation/reload 生命周期仍由
D-013 管理，不属于本决定的前台数据 freshness 边界。

## D-023｜PWA 更新保留当前会话并在自然下次启动接管｜PWA Updates Preserve the Current Session and Activate on a Natural Next Launch

- Status: Accepted
- Source: `USER_DECISION` + `RED-Plan-58` + real built-Service-Worker evidence

PWA 的 remote probe、Service Worker 检查和新版资源安装属于 background
maintenance。当前 document 始终使用启动时的 build identity；更新流程不得主动
reload、改变 route、打断播放/阅读/学唱，也不得通过 `SKIP_WAITING` 抢占仍在使用的
旧 client。新版 worker 可以进入 `waiting`，在全部旧 client 自然结束后按标准
lifecycle activate，下一次自然启动采用新 build。

Settings 是更新详情与手动检查入口，但手动检查也只触发 probe、background
install 和状态展示，不提供会强制刷新当前会话的 apply 动作。Practice progress、
rate、identity-bound timing overrides、Catalog/local snapshot cache 与已下载
Song Edition snapshot 必须跨 App shell 更新保留。D-013、D-016、D-022 继续有效；
真实 iOS installed-PWA 的行为仍需作为 `POST-DEPLOY OBSERVATION` 单独观察，不能由
桌面真实浏览器 integration 冒充证明。
