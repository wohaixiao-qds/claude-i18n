---
description: 查看 Claude Code 双语插件配置
---

# i18n-setup

查看和配置 Claude Code 双语插件。

## 操作步骤

1. 读取配置文件 `~/.claude/plugins/config/claude-i18n/config.json`，如果不存在则使用默认配置（enabled: true）
2. 显示当前配置：
   - 双语显示：已开启/已关闭
3. 如果有参数（`on` 或 `off`），更新配置并保存
4. 提示用户可用的命令：
   - `/i18n-toggle` — 切换双语开关
