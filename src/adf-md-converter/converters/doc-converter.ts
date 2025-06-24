/**
 * Converts a doc ADF node to MarkdownBlock.
 * The markdown is the concatenation of the children's markdown, separated by double newlines.
 * No yamlBlock is generated.
 * @param node The doc ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';

export default function convertDoc(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  const markdown = children.map(child => child.markdown).join('\n\n');
  return { yamlBlock: '', markdown };
} 