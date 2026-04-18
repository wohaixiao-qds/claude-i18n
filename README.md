# Claude I18N - Claude Code 中英双语插件

让 Claude Code 自动使用中英双语进行交流。开启后，Claude 的 AI 回复和 Bash 工具输出都会自动显示中英双语。

## 功能特性

- SessionStart 自动注入双语系统提示，Claude 所有回复自动中英双语
- PostToolUse Hook 自动翻译 Bash 工具的英文输出为双语
- 1100+ 条预置翻译词条，支持模糊匹配
- **动态收集** — 自动收集未翻译的英文短语，下次会话自动翻译并写入用户词典，越用越全
- 提供中文命令集（`/翻译`、`/解释`、`/审查` 等）
- 一键开关，默认开启

## 快速开始

### 方式一：永久安装（推荐）

安装后每次启动 Claude Code 自动加载，无需额外参数。

```bash
# 1. 克隆并构建
git clone https://github.com/wohaixiao-qds/claude-i18n.git
cd claude-i18n
npm install
npm run build

# 2. 添加为本地 marketplace
claude plugin marketplace add /path/to/claude-i18n --scope user

# 3. 从 marketplace 安装插件
claude plugin install claude-i18n@claude-i18n --scope user
```

安装完成后，直接启动 `claude` 即可自动加载双语插件。

### 方式二：临时加载

仅当前会话生效，每次启动需要重新指定。

```bash
claude --plugin-dir /path/to/claude-i18n
```

启动后 Claude 会自动用中英双语回复。

## 使用效果

**AI 回复**（由系统提示驱动）：

```
I've updated the file (我已更新文件). The function now handles edge cases correctly (该函数现在能正确处理边界情况).
```

**Bash 输出**（由 PostToolUse Hook 翻译）：

```
出错了: 命令未找到
error: command not found
```

## 命令

| 命令 | 说明 |
|------|------|
| `/i18n-toggle` | 切换双语显示开关 |
| `/i18n-toggle on` | 开启双语显示 |
| `/i18n-toggle off` | 关闭双语显示 |
| `/i18n-setup` | 查看当前配置 |
| `/翻译 <文本>` | 中英文互译 |
| `/解释 <内容>` | 用中文解释代码或技术概念 |
| `/审查 [路径]` | 用中文进行代码审查 |
| `/中文注释 [路径]` | 为代码添加中文注释 |

## 配置

配置文件：`~/.claude/plugins/config/claude-i18n/config.json`

```json
{
  "enabled": true
}
```

只有一个配置项：`enabled`（布尔值，默认 `true`）。

- `true` — 开启双语显示（默认）
- `false` — 关闭双语，恢复纯英文

也可以通过 `/i18n-toggle` 命令切换，无需手动编辑配置文件。

## 项目结构

```
claude-i18n/
├── .claude-plugin/
│   └── plugin.json          # 插件清单
├── src/
│   ├── types.ts             # 类型定义
│   ├── config.ts            # 配置管理（enabled 开关）
│   ├── translator.ts        # 翻译引擎（模糊匹配 + 反向映射）
│   ├── utils.ts             # 工具函数
│   └── hooks/
│       ├── session-start.ts # SessionStart：注入双语系统提示
│       └── post-tool-use.ts # PostToolUse：翻译 Bash 输出
├── translations/
│   ├── zh-CN.json           # 中文翻译表（1100+ 条）
│   └── en-US.json           # 英文翻译表
├── commands/                # 命令定义（.md）
├── skills/                  # 技能定义
├── package.json
└── tsconfig.json
```

## 工作原理

1. **SessionStart Hook** — 会话启动时注入系统提示，指示 Claude 用中英双语格式回复
2. **PostToolUse Hook** — Bash 工具执行后，将英文输出翻译为中文并与原文一起显示
3. **翻译引擎** — 加载 zh-CN.json 和 en-US.json，构建反向映射，支持精确匹配和模糊替换
4. **动态收集** — 翻译失败时自动提取未翻译的英文片段存入 pending，下次会话启动时 Claude 自动翻译并写入用户词典

### 动态收集流程

```
Bash 输出 → 翻译尝试 → 提取未翻译片段 → pending-translations.json
                                                  ↓
                    用户词典更新 ← Claude 自动翻译 ← SessionStart 读取 pending
```

- `~/.claude/plugins/config/claude-i18n/pending-translations.json` — 待翻译条目
- `~/.claude/plugins/config/claude-i18n/user-dictionary.json` — 用户词典（优先级高于内置词条）

## 开发

```bash
npm install
npm run build    # 编译到 dist/
npm run watch    # 增量编译
npm run clean    # 清理 dist/
```

## 添加翻译

编辑 `translations/zh-CN.json` 和 `translations/en-US.json`，两个文件结构必须一致：

```json
{
  "category": {
    "newKey": "翻译文本"
  }
}
```

## 许可证

MIT
