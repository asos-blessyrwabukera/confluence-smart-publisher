/**
 * Converts a codeBlock ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The codeBlock ADF node
 * @param children The already converted children blocks (should be empty for codeBlock)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertCodeBlock(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  // Extract language if present
  const language = node.attrs && typeof node.attrs.language === 'string' ? node.attrs.language : '';
  // Extract code content
  let code = '';
  if (Array.isArray(node.content)) {
    code = node.content.map(child => child.text || '').join('\n');
  } else if (typeof node.text === 'string') {
    code = node.text;
  }
  // Fallback if code is empty
  if (!code) {
    code = '';
  }
  const markdown = `\n\`\`\`${language}\n${code}\n\`\`\``;
  return { markdown };
} 