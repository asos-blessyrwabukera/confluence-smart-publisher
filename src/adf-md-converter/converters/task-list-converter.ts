/**
 * Converts a taskList ADF node to MarkdownBlock.
 * Generates a Markdown task list, handling indentation for nesting.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The taskList ADF node
 * @param children The already converted children blocks (should be taskItems)
 * @param level The nesting level (default 0)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertTaskList(node: AdfNode, children: MarkdownBlock[], level: number = 0): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'taskList', ...node.attrs });
  }
  // Cada child.markdown já deve ser '[ ] texto' ou '[x] texto', só aplicar indentação
  const markdown = children
    .map(child => child.markdown
      .split('\n')
      .map(line => line.trim() ? `${'  '.repeat(level)}${line}` : '')
      .join('\n')
    )
    .join('\n');
  return { yamlBlock, markdown };
} 