// Claude Code Hook 相关类型

/** stdin JSON received by all hooks */
export interface HookInput {
  session_id: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
}

/** stdout JSON that hooks may emit */
export interface HookOutput {
  systemMessage?: string;
  continue?: boolean;
  stopReason?: string;
  suppressOutput?: boolean;
  decision?: string;
  reason?: string;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
    permissionDecision?: string;
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
  };
}

// 翻译相关类型
export interface TranslationMap {
  [key: string]: string;
}

export interface Translations {
  metadata: {
    language: string;
    languageName: string;
    version: string;
  };
  [category: string]: any;
}

export interface Config {
  enabled: boolean;
}
