/**
 * Converts a tableCell ADF node to MarkdownBlock.
 * The markdown is the concatenation of the children's markdown.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The tableCell ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertTableCell(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'tableCell', ...node.attrs });
  }
  const markdown = children.map(child => child.markdown).join('');
  return { yamlBlock, markdown };
} 