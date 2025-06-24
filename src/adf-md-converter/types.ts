// Shared types for ADF to Markdown conversion

/**
 * Represents a node in the Atlassian Document Format (ADF).
 */
export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

/**
 * Represents a Markdown block with optional YAML metadata.
 */
export interface MarkdownBlock {
  yamlBlock: string;
  markdown: string;
}

/**
 * Centralized icon/emoji map for panels, status, emoji shortnames, etc.
 */
export const iconMaps: Record<string, string> = {
  custom: '📝',
  warning: '⚠️',
  success: '✅',
  error: '⛔',
  info: '💡',
  note: '📝',
  neutral: '⚪',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  purple: '🟣',
  x: '❌',
  check_mark: '✔️',
  smile: '😃',
  sad: '😢',
  wink: '😉',
  laugh: '😆',
  angry: '😠',
  thumbs_up: '👍',
  thumbs_down: '👎',
  blush: '😊',
  surprised: '😮',
  cry: '😭',
  cool: '😎',
};



