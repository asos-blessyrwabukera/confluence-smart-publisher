/**
 * Converts a tableHeader ADF node to MarkdownBlock.
 * The markdown is the concatenation of the children's markdown, wrapped in bold (**).
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The tableHeader ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertTableHeader(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'tableHeader', ...node.attrs });
  }
  const text = children.map(child => child.markdown).join('');
  const markdown = `**${text}**`;
  return { yamlBlock, markdown };
} 