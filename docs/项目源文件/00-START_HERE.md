# RED:REPEAT 接手与 GPT Project 设置

这是一套面向既有项目的落地源文件，按 `AI-Workflow-Assets` 工程项目孵化器的
**Upgrade Existing Project** 模式编制。孵化器源版本为 `750c69673ccaeac9b5999f3b38b8ebc11abebc24`。
工作区是 `D:\CS\red-repeat`，远端是 `MyKr-YSteinsK/red-repeat`，以实际检出的分支和提交恢复。

正式版本与维护基线见[当前状态](STATUS.md)。[升级审查与路线](升级审查与路线.md)
记录 93／94 的工程改动、剩余审计项及 95–98 的手机体验升级和跨页测量。当前阶段以用户的真实使用反馈为后续工作的输入。

## 文件怎么用

| 文件 | 用途 |
| --- | --- |
| [PROJECT.md](PROJECT.md) | 稳定产品、数据与决策合同。 |
| [STATUS.md](STATUS.md) | 当前能力、证据、未决事项。 |
| [RUNBOOK.md](RUNBOOK.md) | 本地运行、数据位置、代码 owner、验证和故障恢复。 |
| [GOVERNANCE.md](GOVERNANCE.md) | GPT Main、Codex Native、Codex Hub 的职责，以及 Issue、验收和交付。 |
| [PROJECT_INSTRUCTIONS.md](PROJECT_INSTRUCTIONS.md) | 粘贴到 GPT Project 的项目指令。 |
| [HISTORY.md](HISTORY.md) | 历史归档摘要、原始 Git 证据和退役文件索引。 |
| [升级审查与路线.md](升级审查与路线.md) | 当前工程审查、路线候选和用户待决事项。 |
| [GPT_GLOBAL_CUSTOM_INSTRUCTIONS.txt](GPT_GLOBAL_CUSTOM_INSTRUCTIONS.txt) | 全局 GPT 自定义指令源，供用户决定是否同步到个人设置。 |
| [GLOBAL_CODEX_AGENTS.md](GLOBAL_CODEX_AGENTS.md) | Codex 全局工作约定候选原文，供独立安装或核对。 |

[根 AGENTS.md](../../AGENTS.md)已指向实际项目合同和恢复入口。两个全局文件来自相同孵化器源版本的
`GPT自定义信息/GPT网页版-ChatGPT 自定义指令.txt` 和 `Codex全局AGENTS/AGENTS.md`。
启用全局设置会影响其他项目，按个人需要在对应应用中单独同步。

## 创建 GPT Project

1. 新建 **RED:REPEAT** Project，把 `PROJECT_INSTRUCTIONS.md` 正文粘贴进 Project 的指令。
2. 上传 `PROJECT.md`、`STATUS.md`、`RUNBOOK.md`、`GOVERNANCE.md`、`HISTORY.md`、
   `升级审查与路线.md`。准备歌曲供稿或正式发布时，按需再提供[歌曲内容生成规范](../歌曲内容生成规范.md)
   或[版本发布规范](../版本发布规范.md)。有 GitHub 访问时可按用户指定的分支或提交读取这些正文。
3. 开新对话，指定附件对应的分支或提交。请它找到三个产品模式、H1/H2 下载边界、当前已发布版本
   各一处原文，以确认当前附件可读。新快照同步后确认正文，避免同名旧文件干扰。
4. 继续本地任务请交给现有 Codex 会话或从根 `AGENTS.md` 恢复。正式任务按
   [工程与交付约定](GOVERNANCE.md)提供完整可读的 Issue/Plan。含私有材料的任务选用授权的私有交接入口。

可复制的 GPT 首轮消息放在下面。

> 接手 RED:REPEAT。以我指定的仓库分支及提交核对项目附件版本，先阅读项目合同、当前状态、运行手册和工程约定。
> 请确认当前已发布版本和进入真实使用反馈阶段的依据。收到具体反馈时，先核对使用入口、操作及实际现象，
> 再用现有合同判断影响范围。需要修改时，按我确认的范围形成交接。

持续维护以仓库中的源文件为准。ChatGPT Project 的指令和附件由用户手动同步。
