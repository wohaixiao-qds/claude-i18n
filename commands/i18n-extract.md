---
description: 从 Claude Code 扩展中提取文本
argument-hint: "[path-to-extension]"
---

# i18n-extract

扫描指定路径（或默认 Claude Code 安装路径），提取可翻译的界面文本。

## 操作步骤

1. 确定扫描路径：
   - 如果用户指定了路径，使用该路径
   - 否则尝试默认位置（如 VS Code 扩展目录中的 Claude Code 扩展）
2. 扫描以下内容提取可翻译文本：
   - `package.json` 中的菜单文本、命令标题
   - JavaScript/TypeScript 文件中的界面字符串
3. 将提取的文本与现有翻译文件 `translations/zh-CN.json` 和 `translations/en-US.json` 对比
4. 列出新发现的、尚未翻译的文本
5. 建议用户是否要将新文本添加到翻译文件中
