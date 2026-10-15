# 六曲内容质量与深度研究基线

审查：RED-Plan-76 / R1，2026-10-15。性质：内容研究与审计，no-version。
本文件记录候选和证据，不批准实际改稿、数据迁移或下一份 Plan。

## 执行摘要

六个 tracked Song Edition 的 46 篇 Explain 正文、240 个 Segment 的原文、译文、
595 个 Ruby span、249 个 layer 条目及必要的 Occurrence/Feature 关系已完成一轮筛查。
发现的主要问题是译文的主客体、否定和跨行语法，以及文章重复和来源定位不足；
不是 46 篇均无价值，也不是全部语言、读音或事实已经通过专家验收。

**内容发布前必须先处理身份风险。** 当前 Compiler 把 Feature 的 hash URL 纳入
Edition.contentHash。即使只改文章正文，新的有效 Edition 也会使旧 timing override
被判 edition-stale；前台 loader 的新载入和 warm-core 刷新均会清除该歌曲旧记录。
个人备份的当前导入规则也拒绝跨 Edition 恢复，更新后再导出还可能跳过旧记录。
所以“先备份再改文章”只是保留证据，不能保证按现有产品无损恢复。
本轮未修改歌曲 source 或用户数据；后续内容发布应先取得明确的数据保护方案批准，
必要时另开高风险工程任务。详见“身份传播与发布前提”。

另有既存恢复缺口：现有46个中文文件名生成的Feature id均不满足最近会话的ASCII
identifier校验。调用真实parseResumeContext/saveResumeContext的只读内存复核中，
46/46被拒绝，保存返回false且未写入。不能把“同Feature id”当作当前Explain文章
已可持久恢复的证明；这个缺口需另行工程修复，不通过本轮改名或放宽校验规避。

推荐首先研究和重构 work-millennium-parade：已有官方合作、发行、作品作者访谈
可构成较强证据链；译文存在高收益修复点，八篇文章的劳动/任务、两极/中道反复论述
也适合整合。推荐不是授权，最终篇数与正文由后续完整 Handoff 决定。
另五曲均有可继续调查的具体问题，不按每曲八篇或每篇长度设配额。

## 现场、方法与证据边界

- 根目录 D:/CS/red-repeat；开工 branch main，HEAD、upstream origin/main 与现场
  git ls-remote 所见 main 均为 762ca5b61f4fd1033e542b5d92e9caddad70972c。
  origin 为 https://github.com/MyKr-YSteinsK/red-repeat.git；package/ledger 为 1.23.0。
  v1.23.0 对应的产品提交为 097419785905e57f39689d7aeb2451760140c3a9。
- 开工无 tracked 修改。既有 docs/archive/retrospectives/、docs/reviews/、
  public/library-runtime.tmp-11104/、public/library-runtime.tmp-32544/ 未跟踪目录
  不读取、不整理、不纳入交付；.private/ 完全未读取。
- 权威依据为当前 AGENTS、Project State 四份文档、歌曲内容生成规范及下文代码 owner。
  D-011 已被 D-021 替代；D-024 的跨模式行为已经由 Plan-66 实现，本轮不回退成 Pending。
  D-016/019 的证据分类、D-020 的 Provisional、D-022/023 均保持不变。
- 统计只访问 Git 列出的六曲 JSON 和 Markdown。人工阅读全部 46 篇与 240 个
  Segment；只读内存脚本检查 UTF-16 半开 span/base/reading/coverage、空字段、
  Segment 引用、Occurrence 映射、Practice 覆盖和正文 Heading。它不是完整
  library:validate，也未重新读取大型音频、运行 Compiler 或验证实际唱法。
- 每篇文章下表独立处置。KEEP 表示主题与主要论证可保留，仍须落实列出的限定；
  MERGE 指保留独特内容后合并，不是立即删除；REPLACE 指该篇应更换问题框架。
  P1 是下一内容批次优先处理，P2 是深写质量提升，P3 是可后置维护。
  本报告不把语言疑点自动认定为已获准修改，尤其不覆盖用户 exact wording。
- 来源均于 2026-10-15 访问。FULL 只支持对应命题，PARTIAL 表示范围不全，
  NO_SUPPORT 表示所读段落不支持该推论；访问失败/未定位用 UNVERIFIED，
  不推断原说法为假。CREATOR 为具名创作者原话，PRIMARY 为官方/原始发布或
  专业辞书直接条目，INSTITUTION 为机构资料，MEDIA 为报道/评论，
  COMMUNITY 仅作解读线索。本文的语义筛查与结构解读属于 RED:REPEAT 编辑观察。

## 六曲总览

下表的 R 是 Feature 引用出现数/不同 Segment 数；各曲所有引用均指向本曲现存
Segment，所有 Segment 至少有一次 Occurrence，Practice 覆盖无重复或遗漏。
原文、译文和全部 layers 都已阅读；普通未列疑点的行仅记 NO_ISSUE_IDENTIFIED，
意思是本轮筛查未发现问题，不是日语专家或有声验收 PASS。

| songId / 当前 metadata | Segment / Occurrence / Section / Unit | Feature / R | Ruby / layers | timing 证据范围 |
| --- | --- | --- | --- | --- |
| work-millennium-parade / Ｗ●ＲＫ；椎名林檎 × 常田大希；2023；Ｗ●ＲＫ / ２〇４５ | 61 / 61 / 11 / 10 | 8 / 72/34 | 166 / Romaji 56、Kana 14 | 保留 CURRENT_STATE 中历史 PASS 40；其余限制不扩展 |
| senbonzakura / 千本桜；黒うさP × 初音未来；2011；千本桜 | 30 / 45 / 10 / 6 | 6 / 35/23 | 68 / Romaji 30 | Plan-49 历史 45/45 playback 校准；Plan-53 迁移不等于新试听 |
| night-dancer-imase / NIGHT DANCER；imase；2022；NIGHT DANCER | 34 / 49 / 11 / 11 | 8 / 35/22 | 66 / Romaji 34 | Provisional 49 |
| shinkai-shoujo / 深海少女；ゆうゆ × 初音未来；2010；EXIT TUNES PRESENTS Vocalohistory | 43 / 43 / 12 / 12 | 8 / 47/26 | 121 / Romaji 43 | Provisional 43 |
| mousou-kanshou-daishou-renmei / 妄想感傷代償連盟；DECO*27 × 初音未来；2016；GHOST | 46 / 57 / 16 / 16 | 8 / 25/18 | 118 / Romaji 46 | Provisional 57 |
| doushite-takase-toya / どうして；高瀬統也 × 野田愛実；2022；13月1日 | 26 / 33 / 9 / 9 | 8 / 19/14 | 56 / Romaji 26 | Provisional 33 |
| 合计 | 240 / 288 / 69 / 64 | 46 / 233/137 | 595 / 249 条 | 本轮未校准 |

46 篇均只有文章 H1，无正文 Heading。Plan-75 的目录隐藏符合当前内容；重写时按
阅读问题安排章节即可。深海少女 metadata 的 2010 是作品年份，album 是后续收录名，
不能读成该 compilation 于 2010 首发；未来资料页应分别核对作品、录音和收录事件。
WORK 的显示 artist 与官方发行 artist 是不同层次，本轮不以 credits 擅改用户显示名。

## 逐篇处置与理由

路径从本文件相对指向现存 canonical Markdown；编号 W/S/N/H/M/D 也用于后文主张和
语言问题。证据列只覆盖指定事实，不背书全文。共用疑点见逐曲语言表和研究空白。

### Ｗ●ＲＫ：八篇

| ID / 文章 | 独特价值与主要问题 | 来源核查 / 分层 | 建议 / 优先级 |
| --- | --- | --- | --- |
| W01 [为什么是《地狱乐》的开场](../../library/work-millennium-parade/features/01-为什么是地狱乐的开场.md) | 首期 OP、2019 旧合作与 2023 新写作的时间链清楚；与 W07/W08 重复人物背景，“Real Sound 曾分析”缺精确文章入口 | C-W01/02 FULL；媒体归因 UNVERIFIED；FACT_CHECK_FIRST | REVISE / P1：留作创作入口，作品分析移到合并篇 |
| W02 [双主创与制作阵容](../../library/work-millennium-parade/features/02-双主创与制作阵容.md) | 制作分工有学习价值；长名单无可直接复核的完整 credits，器乐叠加到“从根部双作者”的推导过快 | C-W03 PARTIAL；音乐听感未试听；FACT_CHECK_FIRST | REVISE / P1：核实 credits 后解释具体声部，不把名单当论证 |
| W03 [劳动、债务、肉身与欲望](../../library/work-millennium-parade/features/03-劳动债务肉身与欲望.md) | 经济/罪责词汇串联有效；与 W08 的身体耗材和求生阅读高度重叠，引用译文有误导 | C-W08 仅编辑观察；TRANSLATION_CHECK | MERGE → W08 / P1：保留现代劳动视角，明确与登岛任务是两种读法 |
| W04 [佛教语汇与“两极之间”](../../library/work-millennium-parade/features/04-佛教语汇与两极之间.md) | 宗教词义帮助重新读歌；“煩悩菩提”教义压缩和中道等同须防跨宗派泛化，前后顺序描述也需核对 | C-W06/09 FULL 仅一般术语；歌曲应用 PARTIAL；FACT_CHECK_FIRST | REVISE / P1：术语与歌曲使用分开，保留已核实词义 |
| W05 [特殊表记与语言机关](../../library/work-millennium-parade/features/05-特殊表记与语言机关.md) | 特殊读法直接服务学唱；“当前正式素材”没有可复核出处，不等于已经核听 | C-W06/07 部分支持；其余读音 UNVERIFIED；TRANSLATION_CHECK | KEEP / P1：保留框架，补逐词版本证据，未证实读法暂挂 |
| W06 [对位段为什么是结构高潮](../../library/work-millennium-parade/features/06-对位段为什么是结构高潮.md) | 语言密度/对位与连续练习关系独立有价值；“高潮”、声部进入次序仍需听证 | 当前 p009 为 o042–o057 可核；C-W08 编辑观察 | REVISE / P2：用声部、歌词位置和可复核听点展开，合并 W04 的重复结论 |
| W07 [画眉丸、佐切与“两极之间”](../../library/work-millennium-parade/features/07-画眉丸佐切与两极之间.md) | 作者中道访谈是八篇最强原作证据；声优访谈欠精确入口，重复 W01/W04/W06 | C-W04/05 FULL 仅作者、设定与章节；声优原话 UNVERIFIED；FACT_CHECK_FIRST | REVISE / P1：作为人物/中道主篇，删除泛化的逐句对应 |
| W08 [死罪人的“工作”为何也可以读成 WORK](../../library/work-millennium-parade/features/08-死罪人的工作为何也叫WORK.md) | 任务与耗材阅读有明确问题；剧情复述与 W01/W03 重复，KPI 比喻偏离原作 | C-W05 FULL 仅基本设定；C-W08 编辑观察 | MERGE ← W03 / P2：以标题的两种阅读为中心，不宣称标题双关获作者证实 |

### 千本桜：六篇

| ID / 文章 | 独特价值与主要问题 | 来源核查 / 分层 | 建议 / 优先级 |
| --- | --- | --- | --- |
| S01 [从 2011 投稿到全民传唱](../../library/senbonzakura/features/01-从2011投稿到全民传唱.md) | 首投与震灾前后创作链有根据；“最初不是为商业发行设计”是意图性否定，来源未证 | C-S01/02 FULL 仅日期和作者回忆；FACT_CHECK_FIRST | REVISE / P1：区分 2011 投稿、2012 配信及后来回顾 |
| S02 [大正浪漫不是历史复原](../../library/senbonzakura/features/02-大正浪漫不是历史复原.md) | 时代拼贴有独立价值；high collar 词源、花魁与武器时序仍需专业辞书/机构材料 | C-S02 FULL 仅作者大正ロマン；其他 PARTIAL/UNVERIFIED | REVISE / P2：用经核实的少量时代错置支撑，不堆历史百科 |
| S03 [佛教、神道与异界词语地图](../../library/senbonzakura/features/03-佛教神道与异界词语地图.md) | 区分多种宗教词汇；常世/黄泉与禅定門译法、称号义和普通“门”混读未解决 | C-S04 UNVERIFIED；TRANSLATION_CHECK | REVISE / P1：先查词条与句法，再扩宗教背景 |
| S04 [断头台、ICBM 与舞台化暴力](../../library/senbonzakura/features/04-断头台ICBM与舞台化暴力.md) | 副歌变形可服务学唱；时代错置与 S02 重复，“刻意互不相容”不能冒充创作者原意 | C-S02 不支持逐词政治密码；编辑观察 | MERGE → S02 / P2：保留 s016/s027/s028/s030 动词对照 |
| S05 [为什么旋律一听就容易记住](../../library/senbonzakura/features/05-为什么旋律一听就容易记住.md) | 作者对小室进行又自我限定，值得保留；“真正稳定的是”仍是编辑音乐分析 | C-S03 FULL 仅作者说法；GOOD_ENOUGH | KEEP / P3：链接原访谈，音乐分析保留限定 |
| S06 [二次创作为何成为作品生命的一部分](../../library/senbonzakura/features/06-二次创作为何成为作品生命的一部分.md) | 表演链能解释传播；大量重述 S01，纪念合辑编制未逐项核对 | C-S01 PARTIAL、C-S02 FULL 仅传播回忆 | MERGE → S01 / P2：留下具体改编比较与纪念项目，不再重复通史 |

### NIGHT DANCER：八篇

| ID / 文章 | 独特价值与主要问题 | 来源核查 / 分层 | 建议 / 优先级 |
| --- | --- | --- | --- |
| N01 [从车里的鼻歌到代表作](../../library/night-dancer-imase/features/01-从车里的鼻歌到代表作.md) | 开头改词与创作场景有潜在价值；车内鼻歌、积极原句和改词因果未在已读访谈定位 | C-N04 UNVERIFIED；C-N01 不支持这些具体细节 | REVISE / P1：找到原访谈，否则以短尺→完整曲的可证链替换该段 |
| N02 [语感、蓝调音与副歌钩子](../../library/night-dancer-imase/features/02-语感蓝调音与副歌钩子.md) | 语音和旋律钩子具独特价值；通用唱法经验不可都归因本曲，训练建议不是实测结论 | C-N02 FULL 仅具体自述；其余编辑建议 | KEEP / P2：精确限定访谈句，未来补具体听点 |
| N03 [ESME MORI 如何把它推向舞池](../../library/night-dancer-imase/features/03-ESME-MORI如何把它推向舞池.md) | 制作人贡献与留白是强主题；韩国成功因果应保留作者回忆语气 | C-N03 FULL、C-N01 FULL 仅交接顺序 | REVISE / P2：区分 imase 完整 demo 与后续编曲，不改成全由制作人创作 |
| N04 [唱针、时钟、房间与同步呼吸](../../library/night-dancer-imase/features/04-唱针时钟房间与同步呼吸.md) | 意象链清楚且已标编辑观察；与实际显示译文 s008/s014 等直接冲突 | C-N01 PARTIAL 仅小空间叙事；TRANSLATION_CHECK | REVISE / P1：先复核跨 Segment 译文，保留双义而非唯一解 |
| N05 [最后才出现的「僕」](../../library/night-dancer-imase/features/05-最后才出现的僕.md) | 文本人称变化可核；“刻意不出现第一人称、旋律微变”的具体作者原话尚未定位 | C-N01 PARTIAL 仅结尾用词更放开 | REVISE / P1：补直接出处，否则降为文本/编辑观察 |
| N06 [为什么它先在韩国爆开](../../library/night-dancer-imase/features/06-为什么它先在韩国爆开.md) | 跨国传播资料丰富；标题“先”、首支 Top100、最高17及奖项混合不同统计边界 | C-N05 PARTIAL；FACT_CHECK_FIRST | REVISE / P1：分平台/日期/指标，避免把回顾当可证明的单一因果 |
| N07 [四年后，它为什么会成为动画 ED](../../library/night-dancer-imase/features/07-四年后成为动画ED.md) | 既有曲后来采用与新作 Fiction 区分正确；ED影像选择逻辑的具体宣传原话待定位 | C-N06 FULL 仅版别和 Fiction 评论；其他 PARTIAL | KEEP / P2：保留时间分层，附官方页面与适用版本 |
| N08 [佐佐木、田山与这首夜曲的第二层意义](../../library/night-dancer-imase/features/08-佐佐木田山与这首夜曲的第二层意义.md) | 明确是后来角色视角；人物背景、Fiction 评论与 N07 重复，多条歌词联想贡献偏薄 | C-N06 PARTIAL；编辑观察 | MERGE → N07 / P2：保留少量可定位镜头比较，不扩剧情百科 |

### 深海少女：八篇

| ID / 文章 | 独特价值与主要问题 | 来源核查 / 分层 | 建议 / 优先级 |
| --- | --- | --- | --- |
| H01 [2010 年的《深海少女》如何成为 Vocaloid 经典](../../library/shinkai-shoujo/features/01-2010年的深海少女如何成为Vocaloid经典.md) | 原作/视觉协作的版本入口；首投日、初专收录及原始视觉完整 credits 尚未直接复核 | C-H01 PARTIAL 仅 2010 原曲；FACT_CHECK_FIRST | REVISE / P1：建立原曲、后续收录、2022重编三层时间表 |
| H02 [海底不是背景，而是整首歌的心理纵轴](../../library/shinkai-shoujo/features/02-海底不是背景而是整首歌的心理纵轴.md) | 空间动词线有文本支撑；后半主动性论证与 H07 重复，译文省略/添加影响阅读 | 编辑观察；TRANSLATION_CHECK | MERGE → H07 / P2：保留完整方向线，避免把隐喻当临床心理事实 |
| H03 [Counter-illumination：真实存在的深海伪装术](../../library/shinkai-shoujo/features/03-Counter-illumination真实存在的深海伪装术.md) | 科学→歌词阅读的好样板，事实与意图已有分层；译文却直接替换术语为心理解释 | C-H02 FULL 仅生物机制 | KEEP / P1：保留文章，复核 s011 显示译文的解释越界 |
| H04 [Marine Snow 为什么会变成“祝福”](../../library/shinkai-shoujo/features/04-Marine-Snow为什么会变成祝福.md) | 下沉与生态营养反差有增量；不能把“祝福”的作者意图据科学倒推 | C-H03 FULL 仅科学定义；GOOD_ENOUGH | KEEP / P3：补精确来源，诗意层仍标编辑观察 |
| H05 [ODESSA 把一首歌变成了一个“初音未来形象”](../../library/shinkai-shoujo/features/05-ODESSA把一首歌变成了一个初音未来形象.md) | 视觉文化有独立问题；游戏 credits、模型原型/首发再版、新版插画均待具体官方页 | C-H04 UNVERIFIED；FACT_CHECK_FIRST | REVISE / P1：分别核对原MV、插画与模型，不能用商品反推原作全部视觉 |
| H06 [从 Project DIVA 到 Project Sekai：一首歌如何活过两个游戏世代](../../library/shinkai-shoujo/features/06-从Project-DIVA到Project-Sekai一首歌如何活过两个游戏世代.md) | 有传播主题；2023收录、2024 Another Vocal 的版本/人选未逐项核实，泛泛平台史与 H01/H05 重复 | C-H04 UNVERIFIED | REPLACE / P2：可改为特定两版声部分配比较，取证前不定正文 |
| H07 [从“深海少女”到“限界少女”：隐藏的颜色终于被看见](../../library/shinkai-shoujo/features/07-从深海少女到限界少女隐藏的颜色终于被看见.md) | 主动伸手与改名有直接文本价值；“第一次主动”过强，s007 已是条件式动作 | 编辑观察，非作者自述 | REVISE / P2：接纳 H02，区分条件式与此刻实际动作 |
| H08 [十二年后的 “deep sea girl” 不是简单重录](../../library/shinkai-shoujo/features/08-十二年后的deep-sea-girl不是简单重录.md) | 官方明确重编，版本区分必要；新插画与旧说明追加时间仍待可读原始 credits | C-H01 FULL 仅发行/重编；C-H04 UNVERIFIED | KEEP / P2：不把2022的声音证据套给当前2010语境音源 |

### 妄想感傷代償連盟：八篇

| ID / 文章 | 独特价值与主要问题 | 来源核查 / 分层 | 建议 / 优先级 |
| --- | --- | --- | --- |
| M01 [《GHOST》第 5 曲与 DECO*27 的一次新方向](../../library/mousou-kanshou-daishou-renmei/features/01-GHOST第5曲与DECO27的新方向.md) | 原始对谈确有新声音/俯瞰写法；“用户提供封面”是内部交付语言，MV月份/编曲名单待原始credits | C-M01/02 FULL；C-M04 UNVERIFIED | REVISE / P1：去交付残留，用原始分工与作品具体例子建立主题 |
| M02 [鬱雑い、理想狂、自恋魔：DECO*27 怎样把“错字感”写成机关](../../library/mousou-kanshou-daishou-renmei/features/02-鬱雑い理想狂自恋魔与特殊表记.md) | 字音分层服务学唱；“本来更常写憎”等词典用法与本曲读法要分别核实 | C-M04 UNVERIFIED；TRANSLATION_CHECK | KEEP / P1：保留特殊表记，不以词典反向常规化原文 |
| M03 [三个「大丈夫」：从不存在，到相信，再到学会撒谎](../../library/mousou-kanshou-daishou-renmei/features/03-三个大丈夫如何把恋爱写成自我欺骗.md) | 三轮语法是强文本线；“用户原翻译”已非当前译文，读者无需看旧交付过程 | C-M02 PARTIAL 仅俯瞰方法；编辑观察 | REVISE / P1：删历史比较口吻，不把俯瞰方法当单曲剧情证明 |
| M04 [阿吽、位相、ローション：爱情为什么像一套失步的同步系统](../../library/mousou-kanshou-daishou-renmei/features/04-阿吽位相与对人ローション的同步系统.md) | 词群关联有价值；工程系统是当代编辑类比，“常见解读”缺社区出处 | 编辑观察；FACT_CHECK_FIRST | REVISE / P2：保留可证词义，收紧过量工程比喻，勿写成心理诊断 |
| M05 [「妄想感傷代償連盟」与「愛情対象年齢」：给感情强行建一套制度](../../library/mousou-kanshou-daishou-renmei/features/05-妄想感傷代償連盟与愛情対象年齢的制度化命名.md) | 制度化命名是独特阅读；“DECO故意”须降为解释，MKDR/DSCF 官方用法尚待核对 | C-M04 UNVERIFIED；编辑观察 | KEEP / P2：与 M04 分开限定问题，删伪作者意图 |
| M06 [「无处可去的愚者旋律」后来真的有了去处](../../library/mousou-kanshou-daishou-renmei/features/06-无处可去的愚者旋律后来有了去处.md) | 作者明确自引，是强增量；“第二次结局”只是比喻，已声明非原角色续篇 | C-M03 FULL；GOOD_ENOUGH | KEEP / P3：增加精确访谈入口和创作年份层次 |
| M07 [从初音未来独唱到「25時、ナイトコードで。」三声部](../../library/mousou-kanshou-daishou-renmei/features/07-从初音未来独唱到25时Nightcord三声部.md) | 后来采用的边界正确；2022加入、三声及2DMV未逐条取证，独唱不等于无叠录声部 | C-M05 UNVERIFIED | REVISE / P2：明确指演唱者配置，不把声部数混成实际轨道数 |
| M08 [从歌曲到ボイスドラマ，再到 MILGRAM 角色翻唱](../../library/mousou-kanshou-daishou-renmei/features/08-从歌曲到ボイスドラマ与MILGRAM角色翻唱.md) | 跨媒体故事有研究价值；“第一次真正扩写”无穷尽证据，商品/脚本/角色CD需分别查 | C-M05 UNVERIFIED；FACT_CHECK_FIRST | REVISE / P1：保留可证发行事件，删“第一次”的不必要断言 |

### どうして：八篇

| ID / 文章 | 独特价值与主要问题 | 来源核查 / 分层 | 建议 / 优先级 |
| --- | --- | --- | --- |
| D01 [先行单曲与《13月1日》：一首失恋歌卡在不存在的日期](../../library/doushite-takase-toya/features/01-先行单曲与《13月1日》-一首失恋歌卡在不存在的日期.md) | EP时间与歌曲时间有好问题；1月22/31、概念说明缺直达来源，日期隐喻与 D06 重复 | C-D04 UNVERIFIED | REVISE / P1：先补发行证据，剧情时间解读合并 D06 |
| D02 [没有「僕」也没有「私」：为什么任何人都能成为叙述者](../../library/doushite-takase-toya/features/02-没有「僕」也没有「私」-为什么任何人都能成为叙述者.md) | 作者原话已直接找到；不固定男女角色是合理观察但不是逐轨分配说明 | C-D01 FULL；GOOD_ENOUGH | KEEP / P3：保留原话范围，补 URL |
| D03 [野田愛実的三次录音：三个副歌，三次全部采用](../../library/doushite-takase-toya/features/03-野田愛実的三次录音-三个副歌三次全部采用.md) | 三take及前夜改词有直接作者证据；不能据此推断无任何后期拼接或三次绝不重唱 | C-D02 FULL 仅作者回忆 | KEEP / P2：把语法差异与实际演唱对照列为后续听证 |
| D04 [「好きすぎたから 愛せなかった」：喜欢过量与爱不下去的悖论](../../library/doushite-takase-toya/features/04-好きすぎたから愛せなかった-喜欢过量与爱不下去的悖论.md) | 可能否定和汉语表达实用；行动能力→关系可持续性仍是解释，旧译比较未对应当前字段 | 编辑观察；TRANSLATION_CHECK | REVISE / P2：收紧“占有欲/依赖”的心理推断，用语法支撑 |
| D05 [「話せない → 話さない → 話してない」：三个副歌的微小语法推进](../../library/doushite-takase-toya/features/05-話せない到話してない-三个副歌的微小语法推进.md) | 三词形对比独立有价值；不说不必等于有意识决定，“阶段推进”不是唯一读法 | 当前文本可核；编辑观察 | KEEP / P2：保留差异及可选解，不把句尾助词固定成情绪公式 |
| D06 [「過ごせる → 過ごせて」：“今天”如何从愿望走到梦醒](../../library/doushite-takase-toya/features/06-過ごせる到過ごせて-今天如何从愿望走到梦醒.md) | 形态对比值得深入；可能态不自动等于愿望，て形不自动等于现在，标题叙事过确定 | 当前文本；TRANSLATION_CHECK、NEEDS_DECISION | REVISE / P1：先解决“今日が良かった”愿望/回顾歧义，再吸收 D01 的互文 |
| D07 [TikTok 之后的长尾：一亿次社交媒体播放与独立音乐扩散](../../library/doushite-takase-toya/features/07-TikTok之后的长尾-一亿次社交媒体播放与独立音乐扩散.md) | 创作预期与失控传播的区分有原话；1亿、奖项和统计口径未逐一复核 | C-D03 FULL；C-D04 UNVERIFIED | REVISE / P2：历史数值标报告日期，月听众不等于歌曲播放数 |
| D08 [从 Acoustic 到现场：双人歌曲为什么适合被反复重唱](../../library/doushite-takase-toya/features/08-从Acoustic到现场-双人歌曲为什么适合被反复重唱.md) | 现场合作可证；版本对比缺音频听证，核心人称解释与 D02 重复 | C-D01/02 PARTIAL；Acoustic 发布 UNVERIFIED | MERGE → D02 / P2：保留经核实的现场例子，另有充分听证才独立成文 |

## 逐曲译文、读音与引用筛查

以下位置均为对应 library/<songId>/lyrics.json 的 Segment ID / 字段。
短片段仅作定位，不是新译稿。P1 项是较强的语义警报，P2 项是歧义或编辑取舍；
候选处理均需后续 Handoff 审阅。未听音频，所有特殊唱法只比较现存书面层，
不把 Ruby 与 Romaji 相互吻合当作实际发音已证实。

### Ｗ●ＲＫ

| 定位 / 当前字段 | 风险与候选处理 | 依据 / 后续证据 |
| --- | --- | --- |
| s002 translation：因未经历 遂不知如何 | P1 TRANSLATION_CHECK；実態不是“经历”，出来損ない也不是“不知如何” | 对照词义与整句修饰关系，先交付忠实候选而非沿旧译润色 |
| s003 translation：听取传闻 | P1；噂ごと的“连同”与吸い取れ的吸收动作被削弱 | 与名詮术语分开核译；C-W06 只证术语 |
| s005 translation：大可庆祝舍弃 | P1；使い捨て、いざ前祝い的对象和先行庆祝逻辑混接 | 连同伽藍/五体复核；勿把伽藍直接定义为空壳 |
| s006 translation：报上名来吧 | P1；名乗ってやるよ倾向说话者报上自己的名字，现译倒转执行者 | 复核省略主语和命令/意愿语气 |
| s007 translation：内心毫无胜欲 | P1；不追求勝ち筋不等于没有求胜欲 | 对照胜利路径/手段与欲望，避免扩大否定 |
| s008 translation：竖起麾令旗 | P2；采配有指挥/判断义，不宜无证据新增挥旗动作 | 词义与銘/名双关分层，不擅改字形 |
| s011/s012 translation：庄家 / 开始惩罚 | P1；Bankers与庄家、Pay Back与惩罚均非唯一对应 | 金融/偿还/报复义并列取舍，不把W03解释锁进译文 |
| s014/s015 translation：一糖一鞭 / 予以他们幻想的答案 | P1；前者新增糖且漏verse，后者新增他们并改变搭配 | 英日混合句结构重审，不以流行意译充当逐句含义 |
| s017/s019 translation：尝试吧 / 为我们奏响四面楚歌 | P1；くれ的受益指向、此方人等尚的“我们仍处”被改写 | s018一并读；弾いて的语义与已给读音要分别核验 |
| s021/s022 translation：穷途末路 / 仍然未死 | P1；潜って行け不是穷途末路，死ねない是“不能死”而非“尚未死” | 保存行动方向、可能否定和生存压力 |
| s024/s026 translation：以干杯来结束吧 / 想彻查清楚 | P1；し終えた是已完成修饰，洗い浚い明かして是彻底坦白的语义线 | 连同本懐果たしたs004核对同构句，不能擅加命令式 |
| s030 translation：凶恶犯的聚集 | P1；Social的には未体现，“聚集”无对应 | 复核社会评价维度，不据动画群像补对象 |
| s032 translation：阳奉阴违 | P2；近义概括漏表面恭敬、实际傲慢/无礼的特征 | C-W07；候选中文需在简短与精确间选择 |
| s035 translation：只允许正常位 | P1；許り在此是ばかり，不能按汉字译成允许 | 现存ruby/notes已与译文冲突 |
| s039/s040 translation：重新定义我的善恶 / 议论我、这能予我帮助 | P1；良し悪しで是判断尺度，諭して不是议论，助かったのなら是条件/已获救 | 是应先修复的事实性语义，不以“诗意”消解 |
| s042–s045、s057–s061 translation | P2；拆行的修饰归属、命令甘んぜよ、流離新增问句和万歳漏义需连段复核 | 按句法连读再决定逐Segment呈现，保留多种可信理解 |
| s003/s021/s028/s031/s035/s038/s049/s056/s059/s061 ruby、Kana、Romaji | READING_CHECK；名詮辞书义/音可证，其余特殊已/間/永遠/流離等须本录音或正式注音 | 不用词典常见音覆盖现有特殊读法；英语行无Romaji不是缺失 |

### 千本桜

| 定位 / 当前字段 | 风险与候选处理 | 依据 / 后续证据 |
| --- | --- | --- |
| s001 translation：维新革命 | P2；ハイカラ的西洋/新潮义被替换为特定历史“维新” | 辞书与时代拼贴研究，不能改回所谓纯大正复原 |
| s008 translation：跟从着浮世浪 | P2；额外“浪”、中文不自然 | 随に的任凭/随着义重审 |
| s013 translation：黄泉之暗 | P1；常世与黄泉不应不加说明合一 | 需日本神话/宗教专业资料，暂不选定定稿 |
| s017/s018 translation：看来…实为 / 人潮来往 | P1；見た目は是外观，现译变“实为”；いったりきたり未必指人潮 | 与将校、花魁道中词义合读，避免补主语 |
| s022 translation：穿过出家僧人旁；notes | P1；を潜り抜けて与“旁”不合；禅定門的称号/门义需要慎选 | 词典义不证明作者在此特指在家男众或僧侣 |
| s025/s030 translation：掌声的同时 / 扣下扳机 | P2；合間的间歇义、撃ちまくれ的反复猛烈动作被削弱 | 保留副歌递进而非所有末句一律处理 |
| s002/s008/s019/s022/s023 ruby、Romaji | READING_CHECK；特殊反复、随、皆、禅定門与厄払い的清浊音须原唱取证 | s023现为やくはらい，不凭常见やくばらい直接判错 |

重复副歌需按 Occurrence 对照：s009 有 o009/o026/o038/o042，s010 有
o010/o027/o039，s011 有 o011/o028/o040/o044。s016/s027/s028/s030 的武器和动作
不是相同 Segment；不能因旋律相近合并原文或套同一注音/唱法结论。

### NIGHT DANCER

| 定位 / 当前字段 | 风险与候选处理 | 依据 / 后续证据 |
| --- | --- | --- |
| s002/s027 translation：你的回声也在闪耀 / 心跳的颜色 | P1；音/光/君的并列与色めき的兴奋义被改成所属或颜色 | 先核词形与语法，再保留诗性 |
| s003 translation：还没停的指针 | P1；原文止まった与现译否定相反；まだ本身也须核正式字形/断句 | 不凭疑似自然语感把canonicalまだ擅改成また |
| s004–s006 translation | P2；入り浸った漏去、変わらないね变疑问、“上了年龄”中文生硬 | 三行连读，尊重没有明确主宾的部分 |
| s007/s008 translation：像…针 / 听腻了流言蜚语 | P1；よく流した与唱片语境不支持流言，现译新增比况 | s007–s010跨行核对，词义层与针的双关解释分开 |
| s010/s012 translation：呆在那的只有你 / 在触碰之前 | P1；いられた的可能/持续、触れた先的之后/更进一步被削弱或倒置 | 触碰对象省略，不强定身体行为 |
| s013–s015 translation：因踏步 / 在别处集合 / 呼吸 | P1；を余所に跨行固定结构被拆错；揃う的主体是随后息 | 当前s014 notes已给出相反于译文的正确结构分析 |
| s016/s017 translation：跳起来 / 雕刻上两人 | P1；踊る是跳舞，二人可作二人一起，非刻下两个人像 | 节奏/时间义可留多义，不能从隐喻锁为物理雕刻 |
| s020/s021 translation：只有现在还在吗 / 越是发现 | P1；いられるのは今だけか的时间限定、見つめる的凝视应保留 | s020与s010成对核对 |
| s024 translation：掠过的旋律 | P1；掠れた的沙哑/朦胧音质不是掠过动作 | notes已说明词义；字形误译 |
| s028 translation：目标很远还不可靠 | P1；夜は長い变成“目标很远”，丢失明确名词 | 先修忠实层，再与おぼつかない作衔接 |
| s031/s033 translation | P2；もういいの的问/自问与省略动作的僕だけを须连后句 | 不为每一短Segment擅补独立剧情；本轮不强定唯一情感 |
| s002/s023/s024/s027 ruby、Romaji | READING_CHECK；どよめき、うわつく、かすれた、いろめき书面层需与本录音核对 | 普通日语词义可筛查，实际连音/假声未听 |

s001 在八个 Occurrence 重复，s002 在三处，s016 在四处，s017 在三处。
共享一个 Romaji 层不能证明八次节奏、吞音和长音都相同。N04 与 N08 的引用即使
ID 合法，也会展示上述不一致译文；优先修译文候选，不继续复制同一隐喻文章。

### 深海少女

| 定位 / 当前字段 | 风险与候选处理 | 依据 / 后续证据 |
| --- | --- | --- |
| s002/s003 translation：经历万般劫难 / 将坠向何方 | P1；億劫不是万劫，どこまでも的无限程度不等于疑问何方 | 与notes已有词义说明比对，避免按汉字中文意译 |
| s007/s008 translation | P2；だけど的转折可跨行，但暗流/迷失方向是新增，見失った也可能是失去光的踪迹 | 待上文指代核对，不无证据指定被带走的对象 |
| s010/s011 translation：令人目盲 / 用自我防御隐藏自己 | P1；强度夸大，科学术语被替换为未经作者确认的心理解读 | C-H02证科学机制，不证意图；保留术语及解释层 |
| s014/s015/s041 translation | P1；閉じこもる的主动退缩、知りたい的求知欲被“闭锁/盼望”抹平 | 同构两次知りたい应先统一忠实语义 |
| s018/s021/s025 translation：为何/永无尽头 / 突然 / 放任 | P2；なのに是转折，降りそそぐ不是突然，わざわざ有特意而非仅放任 | 译文自然度与程度限定复核 |
| s027/s028 translation：单纯的心 / 没被认同 | P1；ハダカ侧重无遮掩，許さない是“不允许”而非认同评价 | 两行构成被黑海阻止的宾语关系，不能孤立润色 |
| s034/s036 translation：泡沫般 / 只将他一人隐藏 | P1；泡沫为额外比喻，ひとりきり很可能指留下的少女而不是被藏的他 | 必须连上下文核主语，保留可争议部分 |
| s037/s039/s040 translation | P2；限界的界限状态、引かれる的拉动、歌う祝福的句法均有编辑扩写 | 不把“被谁”或海雪中动作当日文显式信息 |
| s016/s042 translation；s003/s023/s032 ruby、Romaji | P2 / READING_CHECK；相同原文两译无须机械等字但须解释；yuki、kidzuite等先区分罗马字风格与误音 | 两个不同Segment已有独立Occurrence，不因同文擅合并 |

本曲43个 Segment 各出现一次；“相同文字”与“同一Segment反复”是两类关系。
H03/H04 有强科学来源，不能因此把前面的任一心理动机标为作者亲证。

### 妄想感傷代償連盟

| 定位 / 当前字段 | 风险与候选处理 | 依据 / 后续证据 |
| --- | --- | --- |
| s007/s009 translation：只吐吐舌头 / 来世 | P2；ペロリ的动作指向、重生为其容貌的具体时间不唯一 | 避免把一种可读解释写成唯一事实 |
| s008 translation：我并不不安 | P2；双重中文否定难读；语义先保留“不安じゃない”，不能反改为放手 | 自然度候选，不是发现日文错字 |
| s017/s029 translation、notes | P2；“理想乡/两难”的声音层保留了，但狂/自恋字形层须在解释中并列 | 不按中文表面自恋魔擅改为自恋狂；现译非已证错误 |
| s038/s040 translation、notes | P2；相位/人际润滑剂是可讨论读法，不把技术比喻或lotion的解读当作者定义 | M04已有限定，应让译文与解释分层 |
| s002/s003/s017/s021/s025/s026/s029/s038 ruby、Romaji | READING_CHECK；ちょっと、うざい、号んだ、隨、愛や厭、悪んで等须正式注音/原唱分层取证 | 本轮未发现 span 错；相互吻合不能独立证读音 |
| s019/s036/s043 与 M03 | GOOD_ENOUGH：不存在→相信→学会谎言的词形差异真实存在；不是新发现翻译错误 | 当前译文已是“学会”，删除未来改稿中的旧译交付叙述 |

46个 Segment 全部筛查，现有普通句未发现同等级的主客体/否定倒置。
s020–s025 与 s038–s041 后段重复，s026 在 o026/o057 出现；不能把共享 Romaji 当
每次演唱完全一致的证据，也不能将音响“多声部”与多个演唱角色自动等同。

### どうして

| 定位 / 当前字段 | 风险与候选处理 | 依据 / 后续证据 |
| --- | --- | --- |
| s001/s002、s013 translation | P1；前两行把想起动作前置到s001，s013又省略思い出して；整句可读而孤立引用/试听可能不同步 | D02/D07/D08均引用s001；先确定跨行译文准则，不擅改原Segment边界 |
| s011/s018/s025 translation、notes | P1 NEEDS_DECISION；当前“今天真好”与文章“愿望→回忆→梦”不完全一致；が良かった可有本想/偏好语感 | 可能态/过去可能/て形是事实，叙事时态推导须另核，不硬套三阶段 |
| s016 translation：没打算告诉 | P2；話さない未必总含有意计划，保留普通否定候选 | 与s007/s023及省略的“这件事”联审 |
| s020/s021 translation | P2；相对评价悖论已解释，不改成“世上无人更优秀” | 现有notes明确区分，普通筛查未发现必须改的事实错误 |
| s026 notes：梦本身像会醒的主体 | P2；非标准诗性表记不自动证明拟人意图 | 保留原文，区分字形现象与修辞推断 |
| s007/s016/s023、s008/s017/s024、s011/s018/s025 ruby、Romaji | READING_CHECK；三组词形在书面层确实不同，应保持 | C-D02证三take使用，不证本机每段唱法与字幕逐字一致 |

o001/o013共用s001，o005/o017共用s005，o006/o018共用s006，
s009/s010各有三次演唱；三轮变化句保留不同Segment，避免未来整合时合掉差异。

### 引用关系与阅读重复

- 233处引用结构合法，无跨曲ID或无对应Occurrence；这只证明可解析。
  不少主题反复引用同一副歌，不是需要自动去重的无效链接。
- W01/W03/W08共同围绕s005/s022/s038–s041；W04/W06/W07共同围绕
  s046/s049/s050/s054–s056。应先重分问题，再保留每篇确有解释的引用。
- N07/N08都将后来动画关系映射到s001/s016；H02/H07同用下沉/伸手/出海线。
  当前均有编辑限定，但重复引用不自动贡献新证据。
- D02/D07/D08用s001支撑人称/传播/翻唱，只有人称论证直接依赖该短句；
  传播数据不能由歌词引用证明。W02的乐器名单也不由s011等歌词本身证明。
- Plan-75 的歌词目标按真实 Feature block 顺序定位，并保留来源 preferred
  Occurrence。正文 Heading/段落改变会重建 blockIndex DOM id；它不是跨内容版本
  永久锚点。Feature合并/改名须列出旧id→新id及被删引用，不宣称旧阅读位置无损。

## 主张与来源登记

每条 C-ID 是一个有限命题；同一来源支持一条命题，不代表该文章其他断言也为真。
未列精确日的来源保留未知，不以 URL、搜索抓取时间或页脚年份伪造发布日期。
以下均为摘要，不存采访全文、外部完整歌词、图音或付费材料。

### Ｗ●ＲＫ 样板证据链

| Claim ID / 具体命题 | 精确来源、主体、日期 | 类型 / 支持 | 适用与局限 |
| --- | --- | --- | --- |
| C-W01 / 第一期 OP、共同作词、常田作曲、单曲CD 2023-05-17 | [オープニングテーマ](https://www.jigokuraku.com/music/)，动画官网，页面未标发表日；第一期区块 | PRIMARY / FULL | W01/W02；页面也有2026第二期，不能把当前另一OP的credits混入 |
| C-W02 / 2019前后先做另一首，2023获邀后为作品新写；4月1日先行配信、5月17日CD | [millennium parade × 椎名林檎「Ｗ●ＲＫ」CDリリース](https://www.kronekodow.com/news_detail.php?id=7504&r_page=9)，椎名林檎官网，2023-05-17；常田评论及发行信息 | CREATOR + PRIMARY / FULL | W01；旧合作明确不是本主題歌，不能写成2019已完成WORK |
| C-W03 / 完整器乐、录音及母带制作分工如 W02 所列 | [官方MV入口](https://www.youtube.com/watch?v=dYzgZVhiqmU)，由C-W02官方页导向；本次正文不可读取，发布日期未复核 | PRIMARY / PARTIAL | 共同词曲由C-W01证实；MELRAW、键盘、节奏组等完整名单仍 UNVERIFIED。搜索出现的社媒转载不替代原始credits |
| C-W04 / 中道非预先命题，在连载中浮现；后半主题由佐切承担 | [『地獄楽』インタビュー 賀来ゆうじ](https://www.jigokuraku.com/jigokuraku_interview/)，动画官网刊原作者访谈，未标日；“中道”问答及后续佐切段 | CREATOR / FULL | W07；只证明漫画创作回忆，不证明歌曲作者的逐句意图，勿把贺来与两位词作者混为一方 |
| C-W05 / 死罪人寻仙药换赦免，画眉丸为妻求生，佐切困于杀人之业；第一期双极式标题 | [人物](https://www.jigokuraku.com/character/)与[物語](https://www.jigokuraku.com/story/)，动画官网，未标日；画眉丸/佐切、第一期第2/3/4/10话等区块 | PRIMARY / FULL | W07/W08基本设定可证；声优“互相发现所需”访谈仍未定位，不能以角色页替它背书 |
| C-W06 / 名詮自性的一般读音及名称表性质的佛教语义 | [名詮自性](https://imidas.jp/fourchars/detail/X-01-S-32-8-0001.html)，集英社 imidas 辞书，未标日；词条及成唯識論出处 | PRIMARY / FULL | W04/W05、s003；可证词典读音みょうせんじしょう，不代替本曲逐音听证 |
| C-W07 / 慇懃尾籠是旧有用法，不是把几个汉字随意拼出来 | [慇懃無礼](https://imidas.jp/fourchars/detail/X-01-S-02-A-0002.html)，集英社 imidas，未标日；同义项及历史例 | PRIMARY / FULL | W05、s032；支持表面恭敬而实傲慢/无礼，不支持“阳奉阴违”涵盖全部词义 |
| C-W08 / “反资本主义宣言/幕府雇主/每句特指角色”等阅读得到歌曲作者确认 | 当前W03/W06/W08文本与C-W02/C-W04对照；未找到歌曲作者逐句说明 | 编辑观察 / NO_SUPPORT（作者确认部分） | 劳动、罪责与两极词群仍可受限定地对读；NO_SUPPORT不是否定阅读有价值 |
| C-W09 / 煩悩即菩提与色即是空有教义背景；不能简化为纵欲悟道或一切虚无 | [煩悩即菩提](https://jodoshuzensho.jp/daijiten/index.php/%E7%85%A9%E6%82%A9%E5%8D%B3%E8%8F%A9%E6%8F%90)，新纂浄土宗大辞典/大屋正順，未标日；[経典・般若心経](https://www.sotozen-net.or.jp/soto/sutra)，曹洞宗官网，未标修订日 | INSTITUTION / FULL（一般教义）、PARTIAL（歌曲应用） | W04及s023/s060；不同教义语境不可直接压成“中道=折中=歌手原意” |
| C-W10 / 本曲为动画新写、双曲合作发行；2021影像是附赠现场内容 | [Ｗ●ＲＫ / ２〇４５【First Time Edition】](https://sonymusic.com.tw/album/millennium-parade-x-sheena-ringo-%EF%BD%97%E2%97%8F%EF%BD%92%EF%BD%8B-%EF%BC%92%E3%80%87%EF%BC%94%EF%BC%95%E3%80%90first-time-edition%E3%80%91/)，Sony Music Taiwan，页列2023，未列月日 | PRIMARY / FULL | W01/W02的发行补充；附赠2021现场不是WORK于2021录制/首演的证据 |

上游 SPICE [315225](https://spice.eplus.jp/articles/315225) 本次访问出现解析错误，
不据其未读全文核实常田评论；C-W01/02已经提供更直接的一手替代。
W01/W02/W08 所称 Real Sound 乐评仍待精确标题、作者、日期和原段落；
即使找到，也只归 MEDIA，不升级为词作者意图。

### 另五曲的可复核起点与主张

| Claim ID / songId / 命题 | 精确来源、主体、日期 | 类型 / 支持 | 适用与局限 |
| --- | --- | --- | --- |
| C-S01 / senbonzakura：2011-09-17投稿，后来二创、合作、十周年项目 | [千本桜10周年記念 OFFICIAL SITE](https://whiteflame.jp/10th-senbonzakura/)，WhiteFlame/十周年祭，2021项目页，精确发布日未列 | PRIMARY / FULL（投稿与传播），PARTIAL（合辑每项编制） | S01/S05/S06；回顾序言不能覆盖作者2011当时每一句动机 |
| C-S02 / 作者称大正浪漫/应援歌意识；作曲早于震灾、全部歌词后完成 | [CHART insight 黒うさPインタビュー](https://www.billboard-japan.com/special/detail/1436)，Billboard JAPAN，2015年末访谈语境，页面未列精确日 | CREATOR / FULL | S01/S02/S04；作者对传播原因用猜测口吻，不能写成确定政治编码或专为震灾作曲 |
| C-S03 / 小室进行可能易懂，但作者自己不认为它足以解释成功；配信2012-02-29 | 同上“小室進行”问答；[Senbonzakura / WhiteFlame](https://karent.jp/album/1009)，KARENT发行页，所载发行2012-02-29 | CREATOR + PRIMARY / FULL | S05；KARENT日期是配信事件，不取代2011视频投稿日期 |
| C-S04 / ハイカラ词源、禅定門/常世的具体义及ICBM历史界限 | 后续入口：专业日语辞书、日本宗教/历史机构；本轮未完成具体条目取证 | UNVERIFIED | S02/S03；不以“文化常识”替代引用，不把常世简单等同黄泉 |
| C-N01 / night-dancer-imase：小空间重逢叙事、结尾措辞放开、完整词曲交给ESME MORI后协作编曲 | [NIGHT DANCER誕生の背景](https://www.entax.news/interview/202209241600.html)，entax单独访谈，2022-09-24 | CREATOR / FULL | N03/N04；PARTIAL于N05，未见“刻意全篇不用僕”与“末段旋律微变”的完整说明 |
| C-N02 / 作者说明本曲入口浊音/破裂音、蓝调感及半音钩子 | [誰でも言えることだけど、まだ誰も言っていないことを書きたい。](https://www.uta-net.com/interview/2405_imase_2)，歌ネット，2024年5月栏目，精确日未确认 | CREATOR / FULL | N02；同页前面的信号灯/强女性问答谈Nagisa，不是本曲；泛论不全是本曲技术细节 |
| C-N03 / K-Pop/house感、少音数及鼓音压来自ESME贡献；韩国成功是作者事后看法 | [imaseに訪れた5つの転機](https://realsound.jp/2025/06/post-2072392.html)，Real Sound/矢島由佳子，2025-06-30，页面标PR，采访在5月 | CREATOR / FULL | N03/N06；保留“可能、觉得”而非统计因果证实 |
| C-N04 / 车内鼻歌、开头由积极句改写、为何最后才出现僕 | C-N01/02所读段落不完整支持；可从[Kompass 2023回顾](https://kompass.cinra.net/article/202312-imase)及原采访链继续追查 | UNVERIFIED | N01/N05；不能以“同为imase访谈”补齐未出现的细节；无直接出处时降为观察或删去 |
| C-N05 / 2023韩国传播、Melon最高17、短尺到完整曲；作者并非预设韩国市场 | [imaseと振り返る2023年の“NIGHT DANCER”現象](https://kompass.cinra.net/article/202312-imase)，Spotify/CINRA Kompass，2023-12-27，Sponsored by Spotify | MEDIA + CREATOR / PARTIAL | N01/N06；导语支持Top20/最高17，访谈支持短尺/舞蹈传播和创作过程；原Melon Top100“首支”及奖项细分类别仍待原平台 |
| C-N06 / ABEMA限定先行版ED为旧歌，TV版ED为Fiction，后者评论谈角色关系 | [音楽](https://yanisuu.com/music/)，动画官网，2026项目现行页未标发表日；TV版与ABEMA版明确分区 | PRIMARY + CREATOR / FULL（版别与Fiction评论） | N07/N08；不反推2022原歌写佐佐木/田山；先行版影像“选择逻辑”原文仍待新闻页 |
| C-H01 / shinkai-shoujo：2010曲在2022-12-16发布官方重编新版本 | [新曲「深海少女 -deep sea girl-」MV公開＆配信開始！](https://yuuyu-official.amebaownd.com/posts/39877498)，ゆうゆ官网，2022-12-16 | CREATOR + PRIMARY / FULL | H08；PARTIAL于H01首投确日/完整原始credits。原曲与重编不能混证同一录音 |
| C-H02 / counterillumination以腹侧光匹配上方微光以隐蔽轮廓 | [Bioluminescence / Protection](https://ocean.si.edu/ocean-life/fish/bioluminescence)，Smithsonian Ocean/Ocean Portal Team，2013-09 | INSTITUTION / FULL | H03、s011；心理自我防御仍是编辑解释，科学事实不证明创作者使用意图 |
| C-H03 / marine snow是向深海沉降的颗粒，为深海生物供食；部分沉降数周 | [What is marine snow?](https://oceanservice.noaa.gov/facts/marinesnow.html)，NOAA National Ocean Service，访问文本未显示发表日 | INSTITUTION / FULL | H04、s040；不是少女获救的现实科学机制，也不能用“祝福”反向证明生态创作原意 |
| C-H04 / 2010原始视觉、2014模型/再版、各游戏与2022插画名单 | [原曲发行方MV入口](https://www.youtube.com/watch?v=2CwBFr-Eoxg)仅解析到标题；[2022官方MV入口](https://www.youtube.com/watch?v=T6kVa48UbUw)解析失败；[Niconico原投稿入口](https://www.nicovideo.jp/watch/sm11956364)不可读。后续查SEGA与Good Smile产品页 | UNVERIFIED（具体credits/版本） | H01/H05/H06/H08；不是已确认错误。官方新版本公告足以证明重编，不足以证全部视觉名单 |
| C-M01 / mousou-kanshou-daishou-renmei：《GHOST》2016-09-28，第5曲为本曲 | [DECO*27さんの5thアルバム『GHOST』本日発売！！](https://blog.piapro.net/2016/09/p1609281-1.html)，初音ミク官方博客，2016-09-28 | PRIMARY / FULL | M01；专辑曲序不证MV上传日或全部制作人，也不能自动证心理解读 |
| C-M02 / Neru说本曲club四拍、押韵不破义；DECO描述本专辑俯瞰写法 | [ボカロシーン、焼け野原からの再出発 DECO*27×Neru対談](https://www.cinra.net/article/interview-201609-deco27neru?page=4)，CINRA/金子厚武，2016-09-28，Sponsored by GHOST | CREATOR / FULL | M01/M03；前者是Neru个人听评，后者是专辑创作方法，不是具体恋爱故事设定 |
| C-M03 / 作者明确说愚者/无去处的旋律被后作改成爱/有去处 | [DECO*27が語る、新会社設立で拡張したボカロPとしての未来](https://lp.p.pia.jp/article/news/50440/index.html)，ぴあ刊Real Sound采访/杉山仁，2019-05-14 | CREATOR / FULL | M06；也支持本曲在GHOST中的新尝试定位。不能写成原曲角色的官方幸福结局 |
| C-M04 / MV月份、emon编曲及一時/鬱雑い/悪んで等的正式唱法 | 下一步回到作者MV说明、授权歌词注音/歌本及当前音源；本轮未完成可复核原始音证 | UNVERIFIED | M01/M02/M05；现存Ruby/Romaji结构吻合不算独立来源 |
| C-M05 / Project SEKAI加入/演唱者/2DMV、voice drama脚本及MILGRAM角色CD | 后续分别查SEGA/Colorful Palette、NBCUniversal商品、MILGRAM官方唱片页；当前未逐项复核 | UNVERIFIED | M07/M08；限定后来采用，不引入角色原意或“第一次”断言 |
| C-D01 / doushite-takase-toya：作者刻意不用僕/私，只用君以开放性别投射 | [高瀬統也の“オハコうた”は？](https://barks.jp/news/958480/)，BARKS/山田邦子，页面未显示发表日，正文为2023新年语境 | CREATOR / FULL | D02；与当前日文可交叉核对，不排除英语U&I，亦不决定谁演哪个角色 |
| C-D02 / 录音前夜改词，野田3 take分别用于1/2/大副歌；二人巡演且有无彩排演出 | 同一BARKS访谈“どうして”问答 | CREATOR / FULL | D03/D08；作者回忆不是原始多轨日志，也不是三段唱法已听证 |
| C-D03 / 平成duet与TikTok传播预期，月听众约2–3千到峰值47万且不明全部爆发原因 | [“初めての景色”](https://magazine.tunecore.co.jp/stories/271757/)，THE MAGAZINE/TuneCore Japan，2023-01-25 | CREATOR / FULL | D07；历史月听众、社媒播放和歌曲流媒体播放不能混算 |
| C-D04 / 先行单曲/EP日期、失恋EP概念、1亿社媒播放与Acoustic发表 | 待定位高瀬官网2022-01-13及2022-12-11原公告、TuneCore发行页、野田官方Acoustic发布页 | UNVERIFIED | D01/D07/D08；本轮没有足够直接材料背书全部细节，已有BARKS不补证这些事件 |

COMMUNITY 来源本轮没有被用作确定事实。搜索结果中的社媒转载、翻译博客或一般
歌词解读只用于发现线索，不进入 FULL 结论。没有可读正文/日期就保留研究空白；
未访问的具体商品页不伪造URL。以上负面结果不妨碍研究基线完成。

## 身份传播与发布前提

### 已核实的传播链

1. [compiler.ts](../../src/library/compiler.ts) compileFeatures 读取Markdown并统一换行，
   用 hashText 生成 id.<hash>.md；Feature descriptor 的 id/URL进入 editionPayload。
   同一文件的实际正文、Heading或引用改动都会改变该URL，进而在约第283行
   hashJson(editionPayload)改变Edition身份。JSON类资源先按schema解析再hash；
   纯JSON缩进/键顺序或仅被归一化的换行变化不应一概说成内容身份变化。
2. [song-edition-loader.ts](../../src/runtime/song-edition-loader.ts)约第50行先确认
   active downloaded manifest，之后才选core/cache；约第84–96行用song、
   editionContentHash、audioSourceHash、baseTimelineUrl读取override。
   非none/compatible会调用clearTimingOverrides；warm core的refreshCoreTimingProvider
   约第194–205行做同样处理。warm reopen不绕过新身份核对。
3. [practice-timing-overrides.ts](../../src/practice/practice-timing-overrides.ts)
   classifyTimingOverridesDocument约第128–145行首先比较Edition hash。
   即使audio与Timeline都相同，仅Edition不同也会edition-stale。clear函数约第332行
   删除按songId保存的v3及legacy key，不是仅隐藏当前overlay。
   这是确定的代码路径推演，本轮没有对真实用户localStorage运行实验。
4. [resume-context.ts](../../src/practice/resume-context.ts)约第77行比较全部四项身份；
   [SongEditionPage.tsx](../../src/edition/SongEditionPage.tsx)约第487–533行
   对不兼容最近会话安全回到Practice，不宣称恢复原Explain阅读。
   同文件parseResumeContext的featureId经optionalIdentifier进入ASCII-only正则，
   Compiler却直接使用中文Markdown basename作descriptor.id，Explain的保存回调原样传入。
   只读Node脚本导入真实函数、遍历46个tracked文件名，用合法固定身份作控制：
   不含featureId及ASCII示例能解析，46个真实Feature id全部失败，
   saveResumeContext返回false，模拟storage.setItem调用0次。
   这是现有字段合同冲突的局部复现，未访问真实localStorage或运行UI；
   不能断言所有模式恢复都失败，也不能把它归因于本轮尚未发生的内容更新。
5. [practice-state.ts](../../src/practice/practice-state.ts)按songId存进度，依据现存
   Occurrence优先重新归属Unit；[practice-rate.ts](../../src/practice/practice-rate.ts)
   按songId存速度。这两者没有Edition hash门槛，不能与最近会话/queue混为一谈。
6. [PracticeQueuePanel.tsx](../../src/practice/PracticeQueuePanel.tsx)约第181–205行、
   SongEditionPage约第462–484行检查完整身份及Unit/Occurrence/Segment；
   stale条目仍保存并显示版本变化，不静默重映射，也不能自动继续练。
7. [personal-backup.ts](../../src/practice/personal-backup.ts)约第206–294行
   导入practice/rate/resume/queue/timing均核对所带Edition身份，冲突会跳过。
   [SettingsPage.tsx](../../src/settings/SettingsPage.tsx)约第605–666行导出
   timing/resume/queue时也过滤不兼容项；因此更新后才导出可能已无法保住旧校准。
   [validated-song-context.ts](../../src/practice/validated-song-context.ts)供queue/
   备份预览使用，读取有效快照但不清理timing；真正破坏点不能误归到只读预览。
8. [song-download.ts](../../src/pwa/song-download.ts)约第177–305行逐资源
   校验、存储、复验及validateManifestSnapshot，然后最后写manifest。准备失败或
   取消只清本次新资源，保留完整H1；H2成功后，下一有效选择可成为H2。
   D-022保护快照事务，不把H1的用户override自动重绑定到H2。

### 变更类别矩阵

“hash变”指编译后的有效值/Markdown归一化字节确实变化；不包括无效排版diff。
下表均为未来变更推演，本轮没有实际修改这些资源。

| 未来变更 | 引用/导航 | Edition / timing override | 本机progress、rate、resume、queue、backup | 下载与后续门槛 |
| --- | --- | --- | --- | --- |
| 仅Feature正文、Heading、已有合法引用 | 同id可保留文章入口；段落增删会改变blockIndex，不能承诺永久章内锚点 | Feature URL变→Edition变；audio/Timeline不变仍可clear旧override | 普通Practice进度/速度通常保留；严格resume拒绝旧身份，queue保留但stale；旧备份导入跳过不匹配域 | 完整H1仍可打开；H2必须带全部新文章资源通过manifest-last；内容发布前先解决个人数据策略 |
| Feature增删、文件名/id、合并主题 | descriptor变；旧featureId可能不存在；所有[[segment]]重新验证，需旧→新去向清单 | Edition变；无代码兼容例外 | 同上，Explain最近文章还多了目标不存在风险 | 不发布悬空链接；不以保留同名空壳或复制旧稿代替处理 |
| 仅translation、ruby、layers或notes | Segment ID不变可解析；译文与独立引用语义仍需审 | lyrics URL变→Edition变，audio/Timeline不变仍会stale | ID稳定时普通Practice可继续；严格域仍不兼容，旧备份不能靠相同songId恢复 | 同样触发H2全快照；读音须有对应音证，不能称“只改文案不影响数据” |
| Segment文本/ID或Occurrence→Segment映射 | 改ID须更新Feature refs和映射；相同ID被复用为另一句也有误指风险 | lyrics或Timeline URL变→Edition变；旧校准不能猜测重绑定 | 原Occurrence还存在不等于语义相同；普通进度归属也可能错误地落到旧编号的新内容 | 需显式映射与引用审查；分开审语义兼容，另行授权高风险处理 |
| Practice Unit重组/改id | 练习链接/队列Unit可能变；普通resume有Occurrence优先逻辑 | practice URL也进入Edition，单改Practice同样可能使override失效 | 普通进度依现存Occurrence归组；queue严格Unit和Edition拒绝，backup严格过滤 | 不能以稳定Occurrence推导所有状态无损；单独定验收 |
| canonical timing/Timeline更改 | 唯一startMs/endMs影响所有播放和高亮；Section保持独立 | Timeline URL及Edition变；旧override清除符合严格合同，但必须先核是否已合入/丢失未合入校准 | 旧ID仍在不表示时间语义兼容；resume/queue/备份严格核对 | 另行校准/工程任务；只接受identity-matched export覆盖范围 |
| 音频替换/录音版本变化 | 歌词相同也不能沿用旧Occurrence的声音证据 | source/runtime音频hash和Edition变；通常还须新Timeline；禁止盲迁 | 速度数值或普通进度key可能还在，但不能据此保证正确位置；严格域拒绝旧身份 | 新音频身份、timing及完整下载Gate；不在内容研究内实现 |
| metadata/artwork实际改变 | 显示/资源URL变化；不是纯资料注释 | editionPayload也包含这些值；可能Edition变并牵连override | 严格域同样需评估，不能以“没改歌词”豁免 | 内容发布预检应包括所有Edition输入，而非只看lyrics diff |

H1→H2未完整时的离线/失败回退与“成功换成H2后保持用户状态”是两个问题。
Catalog已指向H2不使完整H1失效，但后台任务成功后也不能保证永远停H1。
D-023保护启动build和兼容本机数据，不放宽内容身份，不允许SKIP_WAITING、
主动reload或用App shell静默升级替代数据兼容验收。没有改PWA协议，
本轮不重新要求installed-PWA真人Gate。

### 发布前必须决定的路线

- **先做内容候选，暂不发布改变Edition的source。** 下一轮可研究、起草、审稿；
  正式集成前需要明确如何保护未合入的个人timing以及严格resume/queue/备份。
  不因本轮是文档就替未来内容发布解除该前置项。
- 推荐另行批准一个范围窄的身份兼容/保全工程任务：先确定同音频、同Timeline、
  稳定Occurrence/Segment时怎样证明兼容，怎样保存旧记录并让用户知情，怎样拒绝
  真实音频/timing变化，以及失败/回滚如何保全。可比较语义分离身份或精确兼容映射，
  不能在本文选定schema/API，也不能只把clear调用删除。
- 该工程设计还应处理真实Feature id与最近会话格式的既存不兼容；不让内容作者为
  躲避代码限制批量改名，也不以本轮静态发现冒充完整恢复功能修复/验收。
- 在旧有效身份下提前导出个人备份与Timing Correction Export有保全价值；
  但当前工具不保证跨hash重导入。手工改JSON hash、降低严格校验或先清数据再重练
  都不是本轮批准方案。公开源码已合入的历史校准不会因本机override删除而消失，
  但未合入的个人校准可能消失，必须区别。
- 如果最终选择保留严格失效策略并接受状态中断，也须用户针对具体数据后果明确决定；
  “文章可丢弃/不备份旧稿”不构成这种同意。当前尚无该决定。
- 后续工程验收要覆盖内容-only H1→H2、cold/warm reopen、兼容/不兼容校准、
  导入预览与失败保全、stale queue及最近会话提示、更新失败保留完整H1。
  是否需要真实客户端阻塞Gate按D-016/019和具体高风险边界决定，不机械跑全设备矩阵。

## 首曲深写候选与另五曲机会

### 推荐首曲：Ｗ●ＲＫ

研究收益来自三条已经分开的链：C-W01/02的歌曲创作与发行，
C-W04/05的原作主题与人物，C-W06/07/09的词义/教义。
这允许从“有共同关键词”推进到“这句话在什么语境下成立”，而不写成角色密码表。
八篇去留方案见W01–W08；建议先形成约六个独立问题的完整候选，篇数不冻结：
创作入口、制作声音、特殊表记、佛教语汇、对位结构、人物/生存任务。
W03/W08可合，W07集中中道，W04/W06保留词义与音乐的不同问题。

拟新增 ADD-W01：**为什么“说出名字”和“替我判断”不断改变发话位置？**
以s003/s006/s008、s017–s020和s038–s041为定位，比较命令/请求/受益关系。
价值是纠正现译主客体后再理解两位人声如何协作；尚不声称每段由谁唱，
也不从和原作相似倒推作者意图。若与W05/W06自然相容，应扩现有主题而非硬增第九篇。

下轮深写的精确取证任务：

1. 从官方MV说明或正式唱片credits逐项核实W02名单，区分词、曲、编曲、
   programming、具体乐器、混音与母带；只记录已见项，缺项不以转载补齐。
2. 复核s002/s006/s021/s030/s035/s040等高风险译文，给出忠实候选、自然中文候选、
   歧义和出处；先解决主宾/否定/条件，不用宏大主题替代词义。
3. 对s031已、s038科、s049咲う、s056間、s059流離等建立
   字形→授权/正式注音→本录音演唱的对应证据；辞书常用音不替代特殊唱法。
   如出现不同实际演唱，只记录Occurrence差异，不在本轮改Segment或timing。
4. 用C-W04准确转述原作者“中道在连载浮现/佐切承载”；核实声优访谈、初期
   章节与现有剧情引用。把漫画作者、词作者、演员和媒体的发言分别署名。
5. 将s046–s057的反义项与真实声部进入次序对齐，记录听点和录音版本。
   当前p009能连续练不等于对位学术分析已成立，也不需要为解释改timing。
6. W03/W08至少比较现代劳动与死罪任务两种解释的收益/局限；删掉不帮助
   重新聆听的剧情梗概、KPI类比及重复结论。以“读法”而非“标题本意”成文。

下一内容 Handoff 至少带：选定文章的完整候选正文与原路径去向表；
Claim→具体来源/日期/发言人/支持范围；译文/Ruby/Romaji逐ID候选及未决项；
短引用与全部Segment引用清单；已有preferred Occurrence的保留办法；
正文Heading结构的阅读理由；exact/candidate/editorial标记；
当前song/Edition/audio/Timeline身份与变更类别清单；
先经用户批准的数据保护路线和该路线的实际验收证据。
不需要legacy-features、backup旧稿目录，不携带未经授权的外部图音。

### 另五曲的增量候选

| songId / ADD候选 | 值得调查的具体问题与来源入口 | 下一步限制 |
| --- | --- | --- |
| senbonzakura / ADD-S01：同一副歌怎样从观看变为行动 | s012/s016→s027→s028/s030的动作/武器变化，结合C-S02的作者自我限定与C-S01传播链，比较一份官方表演/谱面 | 不给每词设政治密码；常世/禅定門先取辞书与宗教证据；可吸收入合并S02 |
| night-dancer-imase / ADD-N01：短尺传播怎样与完整歌曲叙事接合 | C-N05的短尺/舞蹈回忆、C-N01完整词曲到编曲交接、C-N02音感钩子；比较短尺与末段僕出现 | N01/N05缺的直接发言仍待找；韩国榜单与旧歌动画采用分开；不能先写成算法成功公式 |
| shinkai-shoujo / ADD-H01：两种“下沉”为何意义相反 | C-H02的隐蔽轮廓与C-H03的营养沉降，回到s011/s040及动作反转；同题中区分科学机制与诗性解释 | 可将现有H03/H04互引深化而不新增篇；不把科学变成少女的临床诊断；版本比较须固定2010/2022录音 |
| mousou-kanshou-daishou-renmei / ADD-M01：声音为何顺滑而字形不断“出错” | C-M02押韵不破义的创作者对谈，配合M02的特殊表记和三次大丈夫；C-M03说明后来自引改变哪一层 | 原MV/正式注音待补；观察不同字形与声音，不用词典常用字纠正原作，不强套三角恋或特定游戏角色 |
| doushite-takase-toya / ADD-D01：三take与三组语法变化是否相互加强 | C-D01/02原话、三轮異形Segment和C-D03的duet创作意识；比较同录音的演唱分配/语气 | 必须进一步有声取证；過ごせる不机械等于愿望，三take回忆不证无后期处理；可深化D03/D05/D06而非新凑篇 |

## 批次建议、规范增量与审查结论

建议顺序是：补未决来源/完整候选 → 批准并验证用户数据保护路线 →
首曲集中集成/发布 → 按实际研究收益处理另五曲。内容准备可以并行于工程设计，
但任何触发新Edition的集成都不能越过身份前提。下一首和下一Plan尚未批准。

本轮对现有规范只补三类有共性实证的规则：
跨Segment译文应同时检查连续语义和独立引用；重要主张记录精确来源支持范围、
删除已失效的“用户原译”交付叙述；内容发布先检查Edition身份与本机状态后果。
原规范已包含翻译语法、特殊读法、ACGN后来采用及事实/意图区分，不另造平行标准。
Heading按问题价值引入，blockIndex不是永久内容锚点，不要求每篇机械分章。

审查证据为：逐篇/逐Segment阅读、只读结构统计和UTF-16/Ruby/引用/覆盖检查、
公开来源原段落核对、当前identity owners静态推演、报告链接/ID和授权diff检查。
没有运行本地build、Vitest、Compiler、PWA inspection、release smoke，
没有进行音频人耳、日语专家、iOS或installed-PWA验收；这些不计作本轮PASS。
main上的文档提交仍进入现有CI→Pages，实际提交/Push/CI/Pages在最终回执分别报告，
本文不预填自身commit或线上成功。

本基线完成的是可追溯审查与后续候选，不是“46篇全文重写完成”、
“六曲读音/听感全部合格”或新版本发布；也不等于研究结论已被Architect正式接受、
内容方案已批准或产品阶段已推进。
