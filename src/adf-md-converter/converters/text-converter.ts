/**
 * Converts a text ADF node to MarkdownBlock.
 * Applies marks (code, bold, italic, etc) as in the legacy logic.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The text ADF node
 * @param children The already converted children blocks (should be empty for text)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertText(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let text = node.text || '';
  if (Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (mark.type === 'code') {
        text = `\`${text}\``;
      } else if (mark.type === 'strong') {
        text = `**${text}**`;
      } else if (mark.type === 'em') {
        text = `*${text}*`;
      }
      // TODO: handle other marks if needed
    }
  }
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'text', ...node.attrs });
  }
  return { yamlBlock, markdown: text };
} 