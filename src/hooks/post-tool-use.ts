#!/usr/bin/env node
import { translator } from '../translator';
import { configManager } from '../config';
import { Config, HookInput, HookOutput } from '../types';
import { readStdin } from '../utils';

function processHook(hookInput: HookInput): HookOutput {
  const config = configManager.getAll();
  const output: HookOutput = { continue: true };

  // Skip if bilingual is disabled
  if (!config.enabled) {
    return output;
  }

  // Only process Bash tool output
  if (hookInput.tool_name !== 'Bash') {
    return output;
  }

  const additionalContext = processBashOutput(hookInput);

  if (additionalContext) {
    output.hookSpecificOutput = {
      hookEventName: 'PostToolUse',
      additionalContext,
    };
  }

  return output;
}

function processBashOutput(input: HookInput): string | undefined {
  const response = input.tool_response;
  if (!response || typeof response.output !== 'string') {
    return undefined;
  }

  const originalOutput = response.output as string;

  // Skip empty output
  if (!originalOutput.trim()) {
    return undefined;
  }

  // Bilingual display: translated (Chinese) first, then original (English)
  const bilingual = translator.getBilingualText(
    originalOutput,
    'zh-CN',
    'en-US',
    'translated-first',
  );
  if (bilingual === originalOutput) {
    return undefined;
  }
  return bilingual;
}

// --- Main entry point ---
async function main(): Promise<void> {
  try {
    const raw = await readStdin();

    // Empty stdin -- nothing to do, emit a safe default
    if (!raw.trim()) {
      const output: HookOutput = { continue: true };
      process.stdout.write(JSON.stringify(output));
      return;
    }

    let hookInput: HookInput;
    try {
      hookInput = JSON.parse(raw);
    } catch (parseErr) {
      // If we can't parse, silently continue so we never crash Claude Code
      const output: HookOutput = { continue: true };
      process.stdout.write(JSON.stringify(output));
      return;
    }

    const output = processHook(hookInput);
    process.stdout.write(JSON.stringify(output));
  } catch (err) {
    // Top-level safety net: never let an unhandled exception escape.
    const fallback: HookOutput = { continue: true };
    try {
      process.stdout.write(JSON.stringify(fallback));
    } catch {
      // If stdout is already closed there is nothing we can do.
    }
  }
}

main();
