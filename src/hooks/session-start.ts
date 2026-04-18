#!/usr/bin/env node
import { translator } from '../translator';
import { configManager } from '../config';
import { HookOutput } from '../types';
import { readStdin } from '../utils';

// --- Main entry point ---
async function main(): Promise<void> {
  try {
    // Read stdin (Claude Code sends JSON, but SessionStart may send empty or minimal input)
    const raw = await readStdin();

    const config = configManager.getAll();

    const output: HookOutput = {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: config.enabled
          ? [
              '## Claude I18N 双语插件',
              '',
              '双语显示已开启。Claude 将使用中英双语回复。',
              '',
              '可用命令:',
              '- /i18n-toggle - 切换双语显示开关 (Toggle bilingual display)',
            ].join('\n')
          : [
              '## Claude I18N 双语插件',
              '',
              '双语显示已关闭。Use /i18n-toggle on to enable.',
            ].join('\n'),
      },
    };

    if (config.enabled) {
      output.systemMessage = [
        '你已安装中英双语插件。请遵循以下规则：',
        '',
        '1. 所有回复使用中英双语格式，英文在前，中文翻译紧跟其后放在括号内',
        '2. 格式示例：This is an example (这是一个示例)',
        '3. 代码、文件路径、命令等技术内容保持原样，不要翻译',
        '4. 较长的解释可以先用英文写完整段落，再附上完整的中文翻译段落',
        '5. 简短的确认和回复直接用双语格式：OK, done (好的，完成)',
        '',
        '示例回复格式：',
        'I\'ve updated the file (我已更新文件). The function now handles edge cases correctly (该函数现在能正确处理边界情况).',
      ].join('\n');
    }

    process.stdout.write(JSON.stringify(output));
  } catch (err) {
    // Never crash Claude Code. Emit a safe fallback.
    const fallback: HookOutput = { continue: true };
    try {
      process.stdout.write(JSON.stringify(fallback));
    } catch {
      // If stdout is already closed there is nothing we can do.
    }
  }
}

main();
