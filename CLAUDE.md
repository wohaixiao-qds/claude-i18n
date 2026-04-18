# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Plugin Does

Claude Code 中英双语汉化插件。通过 Hooks 系统拦截工具输出并翻译，提供三种显示模式：双语、仅原文、仅译文。

## Build & Dev Commands

```bash
npm run build      # tsc 编译到 dist/
npm run watch      # tsc --watch 增量编译
npm run clean      # 删除 dist/
```

No tests or linter configured.

## Architecture

**Plugin entry point**: `.claude-plugin/plugin.json` registers commands, skills, and two hooks.

**Hook pipeline** — the core mechanism:
1. `src/hooks/session-start.ts` — `SessionStart` hook, outputs translated welcome message
2. `src/hooks/post-tool-use.ts` — `PostToolUse` hook (matcher: `Bash`), translates tool output based on display mode. Skips `Read`/`Write`/`Edit`/`Glob`/`Grep` (file content tools).

**Translation engine** (`src/translator.ts`):
- Loads both `zh-CN.json` and `en-US.json`, builds reverse maps (value→key) for bidirectional lookup
- `translate()` tries direct key lookup → reverse map lookup → fuzzy regex-based substring replacement
- `getBilingualText()` produces dual-language output

**Config** (`src/config.ts`): `ConfigManager` singleton, persists to `~/.claude/plugins/config/claude-i18n/config.json`. Key settings: `currentLanguage`, `displayMode` (bilingual|original|translated), `bilingualOrder`.

**Commands** (`commands/`): JS scripts invoked by slash commands (`/i18n-setup`, `/i18n-toggle`, `/i18n-extract`). Each has a paired `.md` file for UI display. Also includes Chinese-named commands: `/翻译`, `/解释`, `/中文注释`, `/审查`.

**Skills** (`skills/`): Markdown skill definitions for Chinese translation, programming assistant, and code review.

## Adding Translations

Edit both `translations/zh-CN.json` and `translations/en-US.json`. Files share identical structure: `metadata` + categories (`common`, `menu`, `settings`, `chat`, `tools`, `status`). Both files must have matching keys.

## Local Install

```
/plugin install /Users/zhangyu/CodeDevelopment/claude-i18n
```
