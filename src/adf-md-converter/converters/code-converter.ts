/**
 * Converts a code ADF node to MarkdownBlock (inline code).
 * The markdown is the concatenation of the children's markdown, wrapped in backticks (`).
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The code ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertCode(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'code', ...node.attrs });
  }
  const text = children.map(child => child.markdown).join('');
  const markdown = `\`${text}\``;
  return { yamlBlock, markdown };
} 