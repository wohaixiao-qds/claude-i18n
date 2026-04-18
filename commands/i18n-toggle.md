---
description: 切换双语显示开关
argument-hint: "[on|off]"
---

# i18n-toggle

切换双语显示功能的开关。

## 操作步骤

1. 读取配置文件 `~/.claude/plugins/config/claude-i18n/config.json`
2. 如果用户指定了参数（`on` 或 `off`），设置为对应状态
3. 如果没有指定参数，切换当前状态（开→关 或 关→开）
4. 保存更新后的配置
5. 用中文告知用户当前状态

## 示例

- `/i18n-toggle` — 切换双语开关
- `/i18n-toggle on` — 开启双语显示
- `/i18n-toggle off` — 关闭双语显示，恢复英文原文
