/**
 * Converts a bulletList ADF node to MarkdownBlock.
 * Generates a Markdown unordered list, handling nested lists with indentation.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The bulletList ADF node
 * @param children The already converted children blocks (should be listItems)
 * @param level The nesting level (default 0)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

function renderBulletList(children: MarkdownBlock[], level: number = 0): string {
  return children
    .map(child => {
      // Se o item já contém quebras de linha, trata como sublista
      return child.markdown
        .split('\n')
        .map((line, idx) => (line.trim() ? `${'  '.repeat(level)}- ${line}` : ''))
        .join('\n');
    })
    .join('\n');
}

export default function convertBulletList(node: AdfNode, children: MarkdownBlock[], level: number = 0): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'bulletList', ...node.attrs });
  }
  const markdown = renderBulletList(children, level);
  return { yamlBlock, markdown };
} 