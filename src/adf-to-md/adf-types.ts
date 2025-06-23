/**
 * Interfaces for ADF nodes and conversion result
 */

/**
 * Generic ADF Node interface
 */
export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: { type: string; [key: string]: unknown }[];
}

/**
 * Conversion result interface
 */
export interface MarkdownBlock {
  yamlBlock: string;
  markdown: string;
} 