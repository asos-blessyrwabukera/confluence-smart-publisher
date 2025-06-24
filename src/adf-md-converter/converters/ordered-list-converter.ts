/**
 * Converts an orderedList ADF node to MarkdownBlock.
 * Generates a Markdown ordered list, handling item numbering, possible 'order' attribute, and indentation for nesting.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The orderedList ADF node
 * @param children The already converted children blocks (should be listItems)
 * @param level The nesting level (default 0)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertOrderedList(node: AdfNode, children: MarkdownBlock[], level: number = 0): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'orderedList', ...node.attrs });
  }
  const start = node.attrs && typeof node.attrs['order'] === 'number' ? node.attrs['order'] : 1;
  let counter = start;
  const markdown = children
    .map(child => child.markdown
      .split('\n')
      .map(line => line.trim() ? `${'  '.repeat(level)}${counter++}. ${line}` : '')
      .join('\n')
    )
    .join('\n');
  return { yamlBlock, markdown };
} 