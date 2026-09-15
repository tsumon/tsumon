<p align="center">
  <img src="./assets/hero.svg" width="100%" alt="tsumon：循环提醒、本地 Agent 工具，给开源仓库修能合的洞。">
</p>

写循环提醒和本地 Agent 工具。最近在给 [CowAgent](https://github.com/zhayujie/CowAgent) 这类仓库修控制台和通道上的真实问题。图解书在 [看得见的大模型](https://tsumon.github.io)。

## 自己的东西

| 项目 | 一句话 |
| --- | --- |
| [循环提醒](https://github.com/tsumon/reminder-app-ios) · [Android](https://github.com/tsumon/reminder-app-android) | 到期确认才进下一周期；没确认就 1h→4h→12h→24h 再响。 |
| [Suite](https://github.com/tsumon/suite) | Windows 托盘：F1 截图、任务栏网速、透明和深浅色。 |
| [StreamDock](https://github.com/tsumon/StreamDock) | 单二进制 Emby 反代面板。明文导入导出，独立流量页。 |
| [skill-mcp](https://github.com/tsumon/skill-mcp) | 本地 stdio MCP。最多绑 3 个 `SKILL.md`，token 预算加不了名额。 |
| [汽车售后客服](https://github.com/tsumon/auto-cs-agent-sft-dpo) | Qwen2.5-7B 的 SFT + DPO。真正能上线的是推理期约束层。 |
| [AgentFlow](https://github.com/tsumon/agentflow) | Plan → Execute → Review。三个 agent 按序办事。 |
| [看得见的大模型](https://tsumon.github.io) | 图解书。工程铺地，数学捡石，模型走路。 |

## 合进别人的仓库

- [CowAgent #3154](https://github.com/zhayujie/CowAgent/pull/3154) · 控制台侧栏版本号一键源码更新（修 [#3148](https://github.com/zhayujie/CowAgent/issues/3148)）。已合。

## 还在审

未合的不当作成绩。

| 仓库 | PR | 在做什么 |
| --- | --- | --- |
| [CowAgent](https://github.com/zhayujie/CowAgent) | [#3155](https://github.com/zhayujie/CowAgent/pull/3155) | Web / 桌面配置 MCP 和 skills（[#3114](https://github.com/zhayujie/CowAgent/issues/3114)） |
| CowAgent | [#3161](https://github.com/zhayujie/CowAgent/pull/3161) | 钉钉收文件，交给 agent |
| CowAgent | [#3162](https://github.com/zhayujie/CowAgent/pull/3162) | 钉钉流式 markdown 卡片 |
| [openai-agents-python](https://github.com/openai/openai-agents-python) | [#5013](https://github.com/openai/openai-agents-python/pull/5013) | tracing 导出认 `OPENAI_TRACING_INGEST_ENDPOINT` |
| [orca](https://github.com/stablyai/orca) | [#20594](https://github.com/stablyai/orca/pull/20594) | Dashboard 别把还活着的 structured chat 当成死终端 |
| [BettaFish](https://github.com/666ghj/BettaFish) | [#718](https://github.com/666ghj/BettaFish/pull/718) | PDF 导出文件名防路径穿越 |
| [Open WebUI](https://github.com/open-webui/open-webui) | [#30030](https://github.com/open-webui/open-webui/pull/30030) | `Send now` 只发选中的排队消息，并修聊天树写坏 |
