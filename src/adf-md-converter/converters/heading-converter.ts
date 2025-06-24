/**
 * Converts a heading ADF node to MarkdownBlock.
 * If there are extra attributes (besides 'level'), generates a yamlBlock with adfType and attrs.
 * The markdown is the heading marker (#) plus the concatenated children's markdown.
 * @param node The heading ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertHeading(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  const level = node.attrs && typeof node.attrs['level'] === 'number' ? node.attrs['level'] : 1;
  let yamlBlock = '';
  // Only add YAML if there are attrs besides 'level'
  if (node.attrs && (Object.keys(node.attrs).length > 1 || (Object.keys(node.attrs).length === 1 && !('level' in node.attrs)))) {
    yamlBlock = generateYamlBlock({ adfType: 'heading', ...node.attrs });
  }
  const text = children.map(child => child.markdown).join('');
  const markdown = `${'#'.repeat(level)} ${text}`;
  return { yamlBlock, markdown };
}



