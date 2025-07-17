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
  adfInfo?: {
    adfType: string;
    localId?: string;
    id?: string;
    [key: string]: any;
  };
}

/**
 * Simplified converter result - converters only return markdown content.
 * YAML generation is handled centrally.
 */
export interface ConverterResult {
  markdown: string;
  context?: {
    hasComplexContent?: boolean;
    originalType?: string;
    needsYaml?: boolean;
  };
}

/**
 * Document context for converters that need access to the full document.
 * Used by TOC converter to analyze all headings in the document.
 */
export interface DocumentContext {
  allNodes: AdfNode[];
  rootDocument: AdfNode;
}

/**
 * Represents a heading found in the document for TOC generation.
 */
export interface HeadingInfo {
  level: number;
  text: string;
  slug: string;
  localId?: string;
}

/**
 * Centralized icon/emoji map for panels, status, emoji shortnames, etc.
 */
export const iconMaps: Record<string, string> = {
  warning: '⚠️',
  success: '✅',
  error: '❌',
  info: 'ℹ️',
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



