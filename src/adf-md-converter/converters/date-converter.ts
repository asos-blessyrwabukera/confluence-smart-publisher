/**
 * Converts a date ADF node to MarkdownBlock.
 * The markdown is the date in YYYY-MM-DD format.
 * Generates a yamlBlock if there are attributes.
 * @param node The date ADF node
 * @param children The already converted children blocks (should be empty for date)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertDate(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let text = node.text || '';
  if (!text && node.attrs && typeof node.attrs['timestamp'] === 'string') {
    const timestamp = Number(node.attrs['timestamp']);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp);
      text = date.toISOString().slice(0, 10);
    }
  }
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'date', ...node.attrs });
  }
  return { yamlBlock, markdown: text };
} 