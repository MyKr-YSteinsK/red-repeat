# 《Ｗ●ＲＫ》候选内容独立审稿与证据定稿建议

> RED-Plan-79 / R1；审稿日期：2026-10-15；no-version。本文是研究与编辑建议 owner，
> 不是正式歌曲内容、Accepted Decision 或内容集成授权。使用 document-writing 方法，
> 对照实际 source、候选全文和独立打开的来源复核；未将上游模型结论当作证据。

## 审稿结论

七篇候选和 61 行语言表均已独立审阅，建议保留七个主题作为下一轮修订框架，
将旧 W03 的劳动／债务线索合入 W08。**当前包不能原样集成。** 主要问题是：
W02 把自我宣告统称命令，W06 用教学分组和 Timeline 重叠推导音乐对位，
W07 对 s020 的解释误换主客体，W08 把条件性的获救说成既成事实；
W04/W05 还有词语出现次数与字源解释需修正。四篇反复使用“两极”结论，需要分工。

官方来源可以支持创作／发行时间链和漫画作者的中道／佐切论述；不支持将每句歌词
分配给角色，也不足以证明录音中的声部分配。61 行独立处置为
`ACCEPT_CANDIDATE=26 / REVISE_CANDIDATE=20 / KEEP_CURRENT=7 / HOLD_FOR_SOURCE=8`。
这些枚举评价翻译候选，不评价录音发音是否已核听。

内容变化仍会改变 Edition identity。D-028 已解决有效 sparse v3 Timing 的非破坏性
保全和严格旧身份恢复，**没有**批准跨身份套用；最近会话、queue、备份仍有独立边界。
这不阻止研究收口，但下一次实际内容发布必须明确接受其后果或另行授权工程处理。

## 现场和输入指纹

| 项目 | 已核验事实 |
| --- | --- |
| 项目／Git | `D:\CS\red-repeat`；`main` → `origin/main`；开工 HEAD 与远端 main 均为 `642a39edbdea7defd9993144d2ae847dc9f9a2ce` |
| remote／版本 | `https://github.com/MyKr-YSteinsK/red-repeat.git`；package／ledger 当前 `1.23.2`；本轮不改变 |
| source 范围 | 只读 tracked `library/work-millennium-parade/`：旧八篇、61 Segment、61 Occurrence、11 Section、10 Practice Unit |
| 语言结构 | 166 Ruby span、70 layer；真实 `LyricsSchema` 解析成功，仅证明机器合同，不证明语义或唱法 |
| 上游位置 | `D:\CS\temp\Red-Repeat\WORK-深度研究与候选内容-HANDOFF-R1.zip`；直接读取 ZIP，无解压入仓库 |
| ZIP SHA-256 | `c46031521667b2e820861bf737fe9a401b2d93bce4f3d47c0566f7e646dcb3c0` |
| 完整性 | CRC 检查无坏项、无越界路径；七篇候选正文＋README＋来源登记＋语言表，共十个 Markdown 文件 |
| 上游语言表 | s001–s061 各一次；原枚举 REVISE 24 / REVIEW 19 / KEEP 13 / HOLD 5，不等于本次审稿处置 |
| 工作树保护 | 开工无 tracked/staged 修改；仅顶层显示两个人类资料目录和两个 runtime.tmp 目录；不列内部文件名、不读内容、不暂存；不读取 `.private/` |

下表冻结本轮实际审阅的候选字节。Wxx 指文件名前缀，行号从 ZIP 文件首行计数；
没有把本报告修订意见写回 ZIP。

| ID／候选文件名 | SHA-256 |
| --- | --- |
| W01 `01-为什么是地狱乐的开场.md` | `2b9c02848fb2775f5420d964be731f7c5826384167c6d71167001d2c0dc2fe28` |
| W02 `02-双主创与制作阵容.md` | `c13e2969e4981355a925a5a3a33886e85f272b213d318fbc66eb4d0bdd0d7c43` |
| W04 `04-佛教语汇与两极之间.md` | `658cecca066797604de76c5ba502b5928990b19a522d4501f2220231882caf14` |
| W05 `05-特殊表记与语言机关.md` | `669a062eef094dcf3f4f37bba9a97a3883d8fbd675ff8561a80c76c0e5328adc` |
| W06 `06-对位段为什么是结构高潮.md` | `dd6ec9d3343538b635a61c222c03aa45e1afdeb4562c8d24ec947709b7d0dc3a` |
| W07 `07-画眉丸佐切与两极之间.md` | `c4ec9533a8295fb00af6bf9f05f5a81be2c81da6dfe5f73893e0d7cbe5f6b6ae` |
| W08 `08-死罪人的工作为何也叫WORK.md` | `2d50840e220c404a4c717a97b94ccac273d534118a68c7237fb7f7d37344bcd4` |

## 独立主张和来源登记

以下页面均在 2026-10-15 实际打开核对。`FULL` 只适用于该行明示的命题；
`PARTIAL` 表示来源只覆盖其中一层；`NO_SUPPORT` 表示不能由所引材料推出该结论，
不等于已经证伪；`UNAVAILABLE` 表示本次未取得所需页面内容。
未标发表日的辞书页不猜日期；页面最后更新日不冒充初次发表日。

| Claim | 类型／来源、主体、日期与定位 | 支持范围和审稿结论 |
| --- | --- | --- |
| C01 创作、旧合作与发行时间 | CREATOR：[millennium parade × 椎名林檎「Ｗ●ＲＫ」CDリリース](https://www.kronekodow.com/news_detail.php?id=7504&r_page=9)，2023-05-17；正文作品介绍、常田评论及发行栏 | FULL：约 2019 年开始的是《２〇４５》合作；《Ｗ●ＲＫ》是 2023 动画邀约后的新主题曲。4/1 数字先行、4/14 MV、5/17 CD。不能把旧合作年份移给本曲。现有旧 W01 已区分两作，不把此核实包装成首次发现旧稿错误。 |
| C02 第一季词曲分工 | OFFICIAL：[动画音乐页](https://www.jigokuraku.com/music/)，动画制作方；页面无统一发表日；定位「第一期」OP 的词曲和常田／椎名评论 | FULL：词为椎名林檎／常田大希，曲为常田大希，第一季 OP。页面也有第二季内容，不能混读。PARTIAL：椎名希望以自己的方式突出原作信息，不等于逐句角色指定。 |
| C03 MV 制作与运动描述 | CREATOR：同 C01，4/14 MV 介绍及导演児玉裕一评论 | FULL：导演身份、发布日及导演对碰撞／漩涡的整体设计描述。NO_SUPPORT：凭此确定某句人声属于某角色、精确声部对位或乐器声部。 |
| C04 中道与佐切 | PRIMARY：[『地獄楽』インタビュー　賀来ゆうじ](https://www.jigokuraku.com/jigokuraku_interview/)，采访日詰明嘉；无明确发表日；定位询问「中道」、主题浮现和主角转移的问答 | FULL：作者说主题在连载中浮现，后期佐切承载中道／矛盾这一主线。NO_SUPPORT：将漫画作者发言归给两位词作者，或据此认证每句歌词的创作意图。 |
| C05 剧情和人物关系 | OFFICIAL：[故事页](https://www.jigokuraku.com/story/)第一季介绍及第 1、2、3、5 集；[人物页](https://www.jigokuraku.com/character/)佐切介绍；无明确发表日 | FULL：死罪人与执行人、仙药与赦免／回到妻子身边、画眉丸的がらん称号、佐切的武士与女性身份及杀人之业的困惑。PARTIAL：可作歌词对读背景；不能认定所有请求都由画眉丸向佐切发出。人物页未查得“最愛”原词，不伪引该措辞。 |
| C06 名詮自性 | INSTITUTION：[imidas 四字熟语辞典](https://imidas.jp/fourchars/detail/X-01-S-32-8-0001.html)，集英社；未标日；词条释义／出处 | FULL：みょうせんじしょう、名称表明事物本性及佛典出处。PARTIAL：“名实相符”是简释，不能由此保证名称总是正确。NOT_RUN：本录音实际发声。 |
| C07 慇懃尾籠 | INSTITUTION：[imidas 慇懃無礼](https://imidas.jp/fourchars/detail/X-01-S-02-A-0002.html)及[慇懃尾籠](https://kotobank.jp/word/慇懃尾籠-2009492)所载小学館《精選版 日本国語大辞典》；均未标发表日；释义和用例栏 | FULL：过度殷勤反而失礼、外恭内慢的相关义；不能只译为阳奉阴违。辞典历史用例不是本曲创作资料。 |
| C08 煩悩即菩提 | INSTITUTION：[新纂浄土宗大辞典](https://jodoshuzensho.jp/daijiten/index.php/煩悩即菩提)，大屋正順；页面最后更新 2018-03-30，非初刊日；词条正文／署名／页尾 | FULL：大乘不二语境的教义说明，烦恼可成为觉悟的条件。PARTIAL：歌词只写「煩悩菩提」，不能擅添宗派立场或把它解释成纵欲即悟道。 |
| C09 色即是空 | INSTITUTION：[色即是空・空即是色](https://kotobank.jp/word/色即是空空即是色-72634)，小学館《日本大百科全書》，江島惠教；未标日；释义正文 | FULL：因缘而生、无固定自性，非虚无主义。PARTIAL：与歌词的流转意象可作编辑对读，“空”本身不只是事物会变化。上游带中点的 URL 本次失败，已定位到此实际可读路径。 |
| C10 人心地 | INSTITUTION：[人心地](https://kotobank.jp/word/人心地-611396)，小学館《デジタル大辞泉》等；未标日；词条释义 | FULL：正常意识、缓过气／像活人一样的感觉。PARTIAL：s027 可含恢复普通人状态的愿望，不宜缩成悠闲自在。 |
| C11 潜る／くぐる | INSTITUTION：[漢字ペディア词条](https://www.kanjipedia.jp/kotoba/0004100200)，日本漢字能力検定協会；未标日；释义 | FULL：穿过下方、突破或躲过等义。NO_SUPPORT：仅凭字形确定“潜行”、潜水或本录音发音。 |
| C12 甘んずる | INSTITUTION：[甘んずる](https://kotobank.jp/word/甘んずる-427241)，小学館；未标日；释义 | FULL：接受当前处境，可有满足或忍受／甘受意味。语法上「甘んぜよ」是命令。NO_SUPPORT：词义本身保证心态积极“坦然”或排除屈服。 |
| C13 Pay back | INSTITUTION：[Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/pay-back)，Cambridge；未标日；偿还与报复两组义项 | FULL：多义存在。NO_SUPPORT：无宾语的本句必然是还钱，或必然要求某个“他们”付出代价。最终译法 HOLD。 |
| C14 弾く | INSTITUTION：[弾く](https://kotobank.jp/word/弾く-601001)，小学館；未标日；はじく词条 | FULL：弹开、拨动、排斥、计算等义项。PARTIAL：若采用当前 reading はじく，现译“弹唱”不稳；词典不能选定本句对象或录音读法，s019 HOLD。 |
| C15 許り | INSTITUTION：[漢字ペディア](https://www.kanjipedia.jp/kotoba/0001441900)，日本漢字能力検定協会；未标日；ばかり释义 | FULL：限定／净是，不是许可。PARTIAL：支持 s035 译义修正，不证明已核听本曲。 |
| C16 咲的历史义 | INSTITUTION：[漢字ペディア「咲」](https://www.kanjipedia.jp/kanji/0002582900)，日本漢字能力検定協会；未标日；意味／なりたち | FULL：有笑义，原为「笑」本字，日本有开花用法。W05 不能写成词作者新创“借花字写笑”；现代读者同时联想到花开可标 EDITORIAL。本曲是否唱わらう仍 NOT_RUN。 |
| C17 伽藍 | INSTITUTION：[新纂浄土宗大辞典](https://jodoshuzensho.jp/daijiten/index.php/伽藍)，中村琢巳；最后更新 2018-03-30；释义／署名／页尾 | FULL：僧众居处／寺院及建筑群；词本身不等于空壳。PARTIAL：歌词中与空疎并置有解释空间，不应翻译成凡寺院必空疏。 |
| C18 果敢ない／玉響 | INSTITUTION：[果敢ない](https://kotobank.jp/jeword/果敢ない)，小学館《プログレッシブ和英中辞典》；[玉響](https://www.kanjipedia.jp/kotoba/0001589200)，日本漢字能力検定協会；均未标日；释义 | FULL：はかない的短暂、无望等词义及たまゆら的一瞬义。PARTIAL：支持 s061 补出短暂的谓语，不足以固定诗性断句，也不是录音取证。 |
| C19 完整制作 credits | PRIMARY 线索：[官方 MV](https://www.youtube.com/watch?v=dYzgZVhiqmU)，由 C01 官方新闻链接；本次页面读取不可用 | UNAVAILABLE：没有独立读到完整说明栏，不能认定旧 W02 的演奏／录混名单正确或错误，也不能把第三方转载当原始制作名单。留下一轮官方说明栏／唱片内页取证任务。 |

公开官方歌词图片未在本轮完成可视转录核验；仅取得链接不算核验特殊字形。
所有对歌词含义的中文判断均以现有获准 source 为审稿对象；若后续授权歌词与 source
冲突，应暂停相应字段。外部来源只保留必要摘要，不复制采访全文或完整歌词。

## 七篇审稿与旧八篇去向

下列“可采纳”指审稿者推荐保留的内容核心，仍需用户／Architect 采纳及独立集成任务。
行号对应上方指纹冻结的 ZIP；不是当前 canonical 文件的行号。

| 候选／旧稿去向 | 等级与独立价值 | 可保留的段落／证据 | 必须修订或撤下的具体内容 |
| --- | --- | --- | --- |
| W01 → 原 01 ID | REVISE（局部）；回答为何是第一季开场，区别发行与创作事件 | L7–9 的两次合作和三个日期，经 C01/C02 支持；动画任务背景用 C05 | L5 不必围绕旧稿已避免的 2019 误解铺长反驳；L13 “认罪”改为请求原谅的文本观察（s038）；L17 s007 说大半凭运气，不是“承担运气”；L21 导演整体设计与实际声部听感分开；L23 “最适合”是评论，不是来源事实。 |
| W02 → 原 02 ID；保留音乐 credits 研究任务 | REVISE（较大）；发话关系／请求结构有独特价值，但现标题仍承诺制作阵容 | L11–19 可按自我宣告、请对方试／量／裁／劝的句法重组；词曲分工用 C02 | L7、L23–27 的仓库／下一轮／工程流程退出产品正文；L9 “一种命令是我来……”误把名乗ってやるよ等宣告当命令；L13 s019 义项未定；L19 不把 s040 条件写成已经获救；先改标题或补 C19 官方 credits，不能因未取得证据便说旧名单错误。 |
| 旧 W03 无独立候选 → 建议 MERGE 到 W08 | MERGE 推荐，非本轮删除；劳动／银行家／债务与身体消费仍有价值 | s010–015、s027–030 的现代劳动／日常生活线在 W08 保留，宗教欲望线由 W04 承接 | 不能把 Pay Back 固定为债务催收；不把经济隐喻写成唯一创作者原意。下轮须逐项确认覆盖后才删正式 03，无须建立并行旧稿目录。 |
| W04 → 原 04 ID | REVISE；定位于佛教词义与本曲用法的边界 | L7–19 可保留名詮自性／煩悩菩提／色即是空三组，使用 C06/C08/C09；保留非虚无、非纵欲的辨析 | L5 名称表本性比“名实相符”更精确；L11 “第二次出现的煩悩菩提”不准确，61 Segment 中该短语仅一处，改“第二组语汇”；L13 “角色”改说话者或显式编辑对读；L21–27 大段中道结论压缩，留 W07 深讲；L23 成对概念只引单边，补代表性对句或缩小断言。 |
| W05 → 原 05 ID | REVISE；区别字形、词义和听到的声音 | L9–17 对特殊书写、許り误解的提示有用，C06/C07/C15 支持常规释义 | L19 改正“借花字写笑”的历史暗示，补 C16；“故意冗长而不顺口”无作者／音证，改可观察的书写长度；L23 canonical／Ruby／下一轮校验等流程话改为读者可理解的说明；“小小的假名”标题与多为汉字的例子不符。不得将本曲特殊 reading 视作已听证。 |
| W06 → 原 06 ID | REPLACE 当前论证核心；可保留短句累积的文本分析 | 可讨论 s046–057 两两推进与最后结合作用，明确为 EDITORIAL；题目建议转为“短句怎样推向两极之间” | L1 “十六个 Occurrence 必须……”及 L9–13 用 canonical Timeline、p009、产品认可推音乐高潮，属循环论证，撤下；L5 s042–045 句法未定；L17 当前 reading 不证明演唱；L19 “接受并非屈服”不能当甘んずる词典定论；L23–25 删重复中道和检查流程。需声部分配与音乐听证后才能保留“对位”题旨。 |
| W07 → 原 07 ID | REVISE（局部）；七篇中原作作者证据最强，保留核心 | L5 及围绕中道如何在连载中浮现、佐切承载矛盾的段落由 C04 支持；结合第一季情节 C05 | L7 “常见的画眉丸等于强、佐切等于弱”没有传播调查，改为避免二元标签的编辑建议；L15 标题不宜让人以为执行人没有裁断职责；L19 s020 是借相对者认清自身，不是请对方判断，裁判请求应引用 s039。精简重复免责声明，不能替歌曲作者背书。 |
| W08 → 原 08 ID，并承接旧 03 | REVISE；现代劳动词与死罪人任务的双读法可保留 | L7 的英文词簇、日常生活愿望及 C05 的赦免任务背景；明确两条解释都是对读，不推定唯一原意 | L5 “永远结不清”是账本隐喻，不能当情节事实或强定偿还义；L13 s020 不要求他人指出身体缺点；L21 “已经幸存的人”违背 s040 条件；L25 财富自由结局的假想反驳删去。保留劳动代价与求生任务两层，别压成泛泛生存口号。 |

去重后各篇负责一个问题：W01 创作／发行语境；W02 谁宣告、谁向谁请求；
W04 宗教词的准确含义；W05 字形与读音的分层；W06 短句和重复的文本推进；
W07 原作主题与人物；W08 劳动隐喻与求生代价。W04/W06/W07 不再各自完整复述
同一段“两极并存”总结。七篇数量只是目前建议，不是固定产品配额。

## 61 Segment 独立处置

以下每个 ID 只列一次。`ACCEPT_CANDIDATE` 推荐采用上游该行候选语义；
`REVISE_CANDIDATE` 不接受原候选直接落库，列出更精确的修订方向；
`KEEP_CURRENT` 保留现译而不证明特殊发音；`HOLD_FOR_SOURCE` 暂不定稿该行。
未引用外部辞书的行是现有日文文本的语法／编辑审稿，不是新增作者意图事实。
表中的短片段是定位与修订原则，不构成一套已批准的完整译文。

| Segment | 处置 | 独立审稿依据／下一步 |
| --- | --- | --- |
| s001 | ACCEPT_CANDIDATE | 剥き出す的展露动作比“揭露生命”自然；候选保留命令语气。 |
| s002 | REVISE_CANDIDATE | 実態不等于经历，也未必是实体；ない分不必强化成绝对因果。以“缺乏实质、尚未成器”重审，比“实体／半成品”更少增义。 |
| s003 | REVISE_CANDIDATE | 连同传言吸取的方向可用；名詮自性按 C06 解释名称表性质，不能径作保证名实相符；です的陈述与后句命令分开。 |
| s004 | ACCEPT_CANDIDATE | 保留实现夙愿后的更远愿景，不在文章中说愿望已成事实。 |
| s005 | REVISE_CANDIDATE | C17：伽藍本身不等于空壳；“般”是解释性补足，不能掩盖原句关系；前祝い是事前庆祝，不能译成庆祝舍弃身体。 |
| s006 | REVISE_CANDIDATE | 自己报名方向正确；“你认了吧”可能误成承认指控。観念する宜在认命／放弃抵抗语境选词，保留问号语气。 |
| s007 | ACCEPT_CANDIDATE | 勝ち筋为取胜路径；殆ど是大半，不能扩为全凭运气。 |
| s008 | HOLD_FOR_SOURCE | 銘采配不是已核实固定词；“精彩指挥”仍是解释候选，先取作者字形／语境证据，不补挥旗动作。 |
| s009 | REVISE_CANDIDATE | 此方指这边／我方等，候选“此时此地”多出时间；保留正在兜圈的状态，勿擅添永无休止。 |
| s010 | ACCEPT_CANDIDATE | “劳动鼠的天性”保留造词意象，普通中文比“工鼠本性”易懂，不推定具体社会群体。 |
| s011 | ACCEPT_CANDIDATE | 银行家是较直接的 Bankers 对应；“庄家”没有足够特定语境支持。 |
| s012 | HOLD_FOR_SOURCE | C13 两种义项均成立；原文无宾语，不能定“他们”。候选斜线并列是研究备选，不是最终显示译文。 |
| s013 | KEEP_CURRENT | 现译“今日依旧劳动”无本轮必须改动的语义问题。 |
| s014 | REVISE_CANDIDATE | 一糖一鞭不对应字面；verse可为一段词，不必固定为主歌；末尾を须跨行保留未尽结构。 |
| s015 | ACCEPT_CANDIDATE | 给答案添幻想的对应较准确；不保留现译新增的“他们”。 |
| s016 | ACCEPT_CANDIDATE | people保留群体可能，不自动缩成一位恋人。 |
| s017 | ACCEPT_CANDIDATE | 試してくれ请求他人试自己的技艺，候选优于模糊听者自己尝试。 |
| s018 | REVISE_CANDIDATE | 新腰刀工具关系可保留；“那把”“我”的补足须和 s019 共同审，不能补具体砍杀动作。 |
| s019 | HOLD_FOR_SOURCE | C14仅给义项；当前reading为はじいて但未核听，动作对象未明。四面楚歌是处境，不能作要被奏响的乐曲。 |
| s020 | ACCEPT_CANDIDATE | 想借相对者彻底认清自身短处；不是要求他人指出身体缺陷。后续润色可将“身体的缺点”改得更自然，不变主客体。 |
| s021 | REVISE_CANDIDATE | 去掉“穷途末路”有必要；C11不支持一律潜行，宜穿过／闯过。Ruby与Romaji另有不一致，见下节，不在本轮改。 |
| s022 | ACCEPT_CANDIDATE | 死ねない是不能死，不是仍未死；保留危险中的语气。 |
| s023 | REVISE_CANDIDATE | C08支持教义背景，不直接授权在译文中补“即”并确认为等式；保留原词与解释层差别。抱き抱え的抱持动作可保留。 |
| s024 | ACCEPT_CANDIDATE | し終えた是完成后的修饰／愿景，不是命令结束干杯。 |
| s025 | ACCEPT_CANDIDATE | 云えず了い为终究未能说出；候选保留这层未遂。 |
| s026 | HOLD_FOR_SOURCE | 洗い浚い明かす是全盘坦白；候选“好为这份后悔辩解”额外确定目的及後悔的句法关系，需跨句复核再定稿。 |
| s027 | REVISE_CANDIDATE | C10含恢复正常意识、缓过气之义；“做普通人的自在”过于悠闲，需保留历险后重新像个普通人的实感与下句宾语衔接。 |
| s028 | ACCEPT_CANDIDATE | 所渴望内容承接 s027；难题与愿望保留，とわ发声未核听。 |
| s029 | REVISE_CANDIDATE | 道楽家有兴趣、消遣／享乐范围；候选“享乐之徒”仍可能增贬义，不能只凭旧译浪荡就锁定道德判断。 |
| s030 | ACCEPT_CANDIDATE | Social的には是社会评价维度，不是聚集；保留问号而非判罪事实。 |
| s031 | KEEP_CURRENT | 在当前のみ解释下，现译已表达限定；不因保留译文便认定「已」字形或特殊读法获独立认证。 |
| s032 | ACCEPT_CANDIDATE | C07支持过度殷勤反失礼；比单写阳奉阴违贴合。 |
| s033 | KEEP_CURRENT | 简短英语感叹无须扩写。 |
| s034 | KEEP_CURRENT | 现译“布道者”与候选“传教士”没有必要的语义纠错差异。 |
| s035 | ACCEPT_CANDIDATE | C15限定义支持“净是”，不是许可。ばかり一般词义和本录音听证分开。 |
| s036 | ACCEPT_CANDIDATE | 不顾后果地站起，保留莽撞色彩及群体呼告；不是以无铁炮字形编动作。 |
| s037 | KEEP_CURRENT | “此时此刻”可保留，属编辑取舍。 |
| s038 | ACCEPT_CANDIDATE | 请求原谅过去过错，避免把现译“罪恶”扩大为确定法律定罪；とが仍未核听。 |
| s039 | REVISE_CANDIDATE | 新的良し悪し是裁断尺度，不是重新定义“我的善恶”；候选仍把好坏窄化为善恶，需按文章语境保留宽度。 |
| s040 | REVISE_CANDIDATE | 助かったのなら有条件；候选“既然终究得救了”使其成为事实。保留“若／如果”，諭す用开导而非议论。 |
| s041 | KEEP_CURRENT | 现译已接近；候选“无上”增加最高级，不必替换现有世间绝景。 |
| s042 | HOLD_FOR_SOURCE | 关系片段的疏远／厌弃对象及与后三行的连接未定，不补独立主语。 |
| s043 | HOLD_FOR_SOURCE | 迷いさえも保持片段；需与 s042–045 并行／跨行关系共同取证。 |
| s044 | HOLD_FOR_SOURCE | 大自然の是修饰结构，不强行给出完整句义。 |
| s045 | HOLD_FOR_SOURCE | “我自己”比“自身本色”少增义，但整个组块未定，不按线性拼接强制发布。 |
| s046 | REVISE_CANDIDATE | 弱き不等于懦弱；候选新增“自身”尚未确证，可先以知晓弱小的方向精炼。 |
| s047 | ACCEPT_CANDIDATE | 覚える作体会／领会比仅铭记自然；不据此强作教学阶段。 |
| s048 | ACCEPT_CANDIDATE | 闇散って为黑暗散去，不是命令驱散。 |
| s049 | REVISE_CANDIDATE | C16支持笑的字义史，不能证明音轨；“笑着绽开”把字面联想与读法全部压入译文，先区分主译与编辑解释再定。 |
| s050 | ACCEPT_CANDIDATE | 女人与男人的并列可保留，不额外插入“之间”。 |
| s051 | ACCEPT_CANDIDATE | 憎恨与爱恋不必补双方相互，更不指认某对角色。 |
| s052 | REVISE_CANDIDATE | よ是呼告／感叹，候选“所谓”增加质疑距离；不译与否。 |
| s053 | REVISE_CANDIDATE | 与 s052 对称；去掉无据“所谓”，不把错误变为是否错误。 |
| s054 | ACCEPT_CANDIDATE | 保留そして的接续，而非换成“啊”。 |
| s055 | ACCEPT_CANDIDATE | 保持生死及一切的未完接续，范围与后两行一起审，不增万物。 |
| s056 | KEEP_CURRENT | “两极之间”可保留；あわい未新增声音证据，不释作简单折中。 |
| s057 | REVISE_CANDIDATE | C12及语形支持命令，不是倘若；“坦然”过度固定积极情绪，可保留甘受／承受的张力。 |
| s058 | ACCEPT_CANDIDATE | 语义基本不动，清理现译开头多余空格；不声称这是实质新解释。 |
| s059 | REVISE_CANDIDATE | 行こうぞ含共同前行的招呼，生身の流離是名词组；不把两段都改成命令，也不添何处问句。 |
| s060 | ACCEPT_CANDIDATE | 移ろう为迁变，不仅消失；C09的空义仍须与流变的编辑联想区分。 |
| s061 | REVISE_CANDIDATE | 万歳不是万声；果敢ない不能漏。候选“那／便无常”固定了诗性连接，须保留鼓動が的谓语关系；C18不等于录音断句证明。 |

优先修订 s002/s006/s011/s014/s021/s022/s030/s035/s039/s040/s048/s052–054/s057/s061，
但任何单行通过都不授权本轮写 source。保留现译只表示未发现必须替换的语义问题，
不否认未来可作风格提升。

## 读音、声部与未决证据

**本轮音频聆听、特殊发音核听、音乐对位听证均为 NOT_RUN。**
以下限制不阻塞本轮研究交付，但阻塞对应新读法／声音事实的正式宣称：

| 项目 | 可确认与待补证据 |
| --- | --- |
| s003／s031／s038／s049／s056／s061 | 已读全部现存 Ruby／Kana／Romaji。C06/C16/C18 只给词汇或字史支持，未独立核听みょうせんじしょう、のみ、とが、わらう、あわい、はかない的本录音表现；正式字形和唱法分开取证。 |
| s008／s019 | 銘采配的字形／语境、弾いて的对象及实际 reading 需优先取证；不能靠当前相互转写字段投票。 |
| s021 | 当前 Ruby／Kana 为ぞっかい，Romaji却为 `zokukai`，遗漏了对应促音的书写一致性；くぐって词义可查，但 notes 声称本曲资料已标读的上游出处本轮未取得。先取实际录音／授权资料，不能自行改成词典读法。 |
| s028／s035／s059 | とわ、ばかり、さすらい的当前存量字段不等于此录音已核听。C15支持限定义，不替代声音证据。 |
| s057 | Romaji `aman zeyo` 的分词可审（连续词形 amanzeyo），本轮未确认发声，不把展示空格问题冒充音轨错误。 |
| s042–s057／p009 | p009 确含 o042–o057；该组 15 对相邻区间均有重叠，约 116–1689 ms。数据可证明教学分组和时间重叠，不能证明每对实际同时发声、两歌手分配或对位写作。s042–045 跨片段语法保持 HOLD；不能从练习配置反向证明艺术家音乐意图。 |
| 完整制作名单 | C19 未取得，不能把 W02 转题当作已经核实旧 credits 有误。后续取得官方 MV 说明栏／唱片内页，逐项记录角色与版本，再决定是否附简表。 |

当前 WORK 历史已校准的部分覆盖继续按 CURRENT_STATE 原记录，不扩充为 61/61 human PASS。
未核听不是需要为本次文档工作新增的一轮全设备 BLOCKING USER CHECK；后续若要发布
新的特殊读法／Calibrated Timing 声明，须为那个边界取得相应证据。

## 引用、章节与实际渲染合同

只读脚本直接读取 ZIP，并调用仓库真实 `parseFeatureArticle` 与
`getExplainArticleHeadingTargets`，不是仅用正则猜测章节。第一次直接导入受到 Node
不识别 CSS 的环境限制；随后仅在进程内为 CSS 返回空模块，成功导入真实解析代码。
未编辑 parser、未运行 Compiler、未写 generated 文件。另以真实 `LyricsSchema.safeParse`
核对当前 lyrics；Ruby 的结构合法性不延伸为唱法／翻译结论。

| 候选 | 引用次数／不同 Segment | 正文 H2／不同目标 | 结构结果 |
| --- | --- | --- | --- |
| W01 | 9 / 9 | 3 / 3 | 引用存在、目标唯一 |
| W02 | 12 / 10 | 4 / 4 | 同上；1 对反引号会按字面显示 |
| W04 | 15 / 15 | 4 / 4 | 引用存在、目标唯一 |
| W05 | 10 / 9 | 4 / 4 | 引用存在、目标唯一 |
| W06 | 19 / 18 | 4 / 4 | 同上；4 对反引号会按字面显示 |
| W07 | 10 / 10 | 4 / 4 | 引用存在、目标唯一 |
| W08 | 15 / 15 | 4 / 4 | 同上；1 对反引号会按字面显示 |
| 合计 | 90 / 43（全包去重） | 27 / 27（含文章 ID） | 未发现不存在的 Segment 或重复章节目标 |

结构 PASS，**语义和显示验收尚不通过**：W01/W07/W08 对 s020、s040 等的解释需要
以上修正；W04 成对论述只引用部分单边句子应补代表性对句；W02/W06 不能引用
待决 s019／s042–045 后便假装句义已确定。具体关联须随修订后正文再审一次。

当前 [FeatureMarkdown.tsx](../../src/edition/FeatureMarkdown.tsx) 将行内歌词标记转为
段落后的引用卡，不是真正嵌在文字中的普通链接。W06 首段 12 张卡连排阅读负担大，
建议选少量代表性配对，其余靠完整歌词上下文，不为每个词堆卡片。
该 renderer 仅支持既有强调等有限语法，反引号不会生成代码样式；上述三篇共六对
反引号应从面向读者的正文移除。不能为适配候选擅改 renderer。

章节按 [explain-article-navigation.ts](../../src/edition/explain-article-navigation.ts)
使用文章 ID 和 blockIndex 生成目标。七篇每篇三至四节各有可识别的问题，基本有阅读价值；
删掉流程说明／重复总结后重新核验节名和边界。段落重排会改变 blockIndex，不能承诺
文章修订前后永久章内锚点，也不需机械保持旧段落序号。

## 身份与数据影响：下轮集成必须明示

以下是对真实 owners 的只读代码推演，不是运行用户数据迁移，也不是本轮新产品行为。

| 变化／数据域 | 当前有效合同与后果 |
| --- | --- |
| 仅正文／Heading／合法引用 | [compiler.ts](../../src/library/compiler.ts) 的 `compileFeatures` 统一换行后 hash 文本，生成 Feature URL；descriptor 进入 editionPayload，再生成 Edition.contentHash。有效文本变化即使同文件名也改变 Edition；不等于 audio／Timeline 必变。 |
| 七篇替换、删除旧 W03 | 文件 basename 是 Feature ID。其余七个若保留原 basename，可保留描述符 ID；W03 删除会让旧 ID 不存在，不能自动跳到 W08。新标题可改而 ID 先稳定，文件改名另审。旧→新去向表是集成输入，不是已实现重定向。 |
| 只改 translation／ruby／layers | lyrics 文档 hash／URL 改变并传播到 Edition。Segment ID 稳定可保留引用，不代表全数据域兼容。读音变更还必须独立核验声音，不可附带改 canonical 原文或时序。 |
| sparse v3 Timing | [song-edition-loader.ts](../../src/runtime/song-edition-loader.ts) cold／warm 均调用保全后按身份读取；[practice-timing-overrides.ts](../../src/practice/practice-timing-overrides.ts) 以 song／Edition／audio／Timeline 完整身份归档与选择。D-028保留原始旧值，H2不应用H1；有效完整H1重新活动时可严格恢复。不能再把 Plan-76 的旧 clear 路径写作当前自动删除行为；存储失败／冲突仍 fail closed。 |
| 最近会话／Explain | [resume-context.ts](../../src/practice/resume-context.ts) 的 `isResumeIdentityCompatible` 严格比对四项身份；不同 Edition 不保证恢复旧 Explain。Plan-77已支持中文 Feature ID，不能把已修复的 ASCII-only 历史问题重报为当前缺陷。 |
| 同 Edition 内不存在的文章目标 | [ExplainWorkspace.tsx](../../src/edition/ExplainWorkspace.tsx) 选中 ID 无匹配时使用首个 topic；这只是安全 fallback，不是 W03→W08 的定向迁移，也不保留旧阅读位置。跨 Edition 的 resume 先受上行严格检查，不能靠此 fallback 绕过。 |
| queue | [practice-queue.ts](../../src/practice/practice-queue.ts) 及消费路径严格核对身份和 Unit／Occurrence／Segment。旧条目可保留但 stale，不默认为兼容，不自动继续练；D-028不迁移它。 |
| 普通 Practice progress／rate | [practice-state.ts](../../src/practice/practice-state.ts) 按 songId 保存并依据现存 Occurrence 重新归属 Unit；[practice-rate.ts](../../src/practice/practice-rate.ts) 按 songId 保存速度。未设同样的 Edition hash门槛，不应说内容更新必然清空所有进度／速度。删除／复用结构 ID仍有语义风险，本轮不改结构。 |
| 个人备份／Timing archive | [personal-backup.ts](../../src/practice/personal-backup.ts) 导入按所携完整身份验证，不能因本机普通速度可保留便宣称旧备份跨 Edition 可恢复。常规备份不包括历史 Timing archive；Settings单独归档导出不是新 Edition correction，也没有自动跨身份导入授权。 |
| D-022 下载 | [song-download.ts](../../src/pwa/song-download.ts) 验证全部资源与身份后 manifest-last；H2未完成或失败保留完整H1。H1仍带旧八篇，H2须带新集合，不允许半新半旧。Catalog指H2不自动使H1失效；成功选H2也不重绑H1个人数据。 |
| D-023 App 更新 | 当前 document保持启动build，后台准备、下次自然启动采用；内容研究不修改 worker／update协议，不以reload／SKIP_WAITING规避身份检查。 |

集成前的 STOP 项：未获批准的原文／字形冲突；尚未解决的 HOLD 行却要求换成确定译文；
把未核听读法作为正确发声发布；要求跨 identity迁入校准／queue／resume但未授权工程方案。
普通内容发布若接受严格 stale行为，须明确让用户理解可保留旧Timing却不自动应用新Edition，
以及旧普通备份的恢复限制；不能只说“有备份就无风险”。本轮没有发现必须改代码才能完成
研究报告的冲突，没有实施路线 B。

## 下一份内容 Handoff 的最小输入

| 状态 | 可交给下轮的范围／条件 |
| --- | --- |
| APPROVED_CANDIDATE（审稿推荐，不是用户批准） | C01/C02的时间与基本词曲事实、C04的作者原话支持范围、C05第一季背景；表中 ACCEPT_CANDIDATE 的候选语义以及 KEEP_CURRENT 行。采用前仍核对完整句、版权摘要边界与上下文。 |
| CONDITIONAL | 七主题框架；按逐篇清单修订全文、删除工程流程和重复结论、修正 s020／s040等引用。REVISE_CANDIDATE 行需另给精确最终中文，不能直接采用本报告的原则摘要。重新提交七篇完整文本及逐 ID变更表／源指纹。 |
| HOLD | s008/s012/s019/s026/s042/s043/s044/s045；特殊 reading 的新增确定性声明；完整制作 credits；实际声部／对位／角色发声分配。补来源或听感证据后逐项解锁，未解锁部分可保持当前 source，不强迫全包同时上线。 |
| NEEDS_USER_DECISION | 是否采纳七篇与旧03→08的编排；最终精确文字及未解决诗性取舍；是否接受严格身份导致 resume／queue／旧备份 stale，或另立高风险工程任务处理。D-028不自动授权路线B，审稿完成不代替上述批准。 |

下轮须冻结：完整最终正文、原八→新集合映射、Feature basename清单、61行精确译文变更
（未改行明确不动）、引用／章节复验、每个事实与来源的对应、HOLD残留及处理、
Edition前后身份／用户数据告知和H1/H2验收范围。不得顺带修改Ruby／Romaji／audio／
Timeline或替换正式字形；这些字段需要独立明确权限与证据。不启动下一份Plan。

## 验收证据和交付限制

| Gate | 状态 | 本轮证据／限度 |
| --- | --- | --- |
| BASE-AND-HANDOFF | PASS | 现场root／Git／版本、ZIP完整性与指纹，七候选＋旧八篇＋61行均实际读到。 |
| INDEPENDENT-SOURCE | PASS | 独立核对C01–C18原页面；C19明确UNAVAILABLE。FULL只限明示命题，不放大成全文事实PASS。 |
| ARTICLE-QUALITY | PASS（审稿覆盖） | 七篇逐项评审、旧八篇映射、必要修订和重复主题均定位；候选原样采用不通过。 |
| TRANSLATION-61 | PASS（逐行处置） | s001–s061无遗漏，有独立理由和明确HOLD；不代表61条最终译文全部获准。 |
| REFERENCES-AND-HEADINGS | FAIL（候选语义／显示）；结构PASS | 90引用、43不同Segment、27章节目标均存在；s020／s040等语义与反引号显示须修订后重新验收。审查已完成，按Plan允许以发现缺陷收口研究，不把此FAIL隐藏成候选可上线。 |
| IDENTITY-SAFETY | PASS | 对照现行D-028和各域owners，只读推演、无迁移／放宽／source改动；发布前待决事项显式列出。 |
| SCOPE-AND-DELIVERY | PASS（范围／静态）；Git结果见最终TASK_RESULT | 只写本报告、必要owner／状态及研究基线历史时效澄清；提交、远端、CI／Pages必须按真实结果单列，不预填自身commit。 |

候选内容的FAIL／HOLD是本次研究产物；本轮交付目标是完整、独立、可追溯的审稿，
不是让所有原候选强行通过。未执行本地build／Compiler／Vitest／PWA inspection／
release smoke、真实音频试听、iOS／installed-PWA，不报告这些项目PASS。
本轮no-version，正式歌曲八篇和61Segment保持原样；不意味着EVIDENCE_ACCEPTED或STAGE_ADVANCED。
