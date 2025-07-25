/**
 * Converts a text ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The text ADF node
 * @param children The already converted children blocks (should be empty for text)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertText(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  let text = node.text || '';
  if (Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (mark.type === 'code') {
        text = `\`${text}\``;
      } else if (mark.type === 'strong') {
        text = `**${text}**`;
      } else if (mark.type === 'em') {
        text = `*${text}*`;
      } else if (mark.type === 'link') {
        // Handle inline links
        const href = mark.attrs && typeof mark.attrs['href'] === 'string' ? mark.attrs['href'] : '';
        text = `[${text}](${href})`;
      }
      // TODO: handle other marks if needed
    }
  }
  return { markdown: text };
} 