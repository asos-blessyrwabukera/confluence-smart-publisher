/**
 * Converts a bodiedExtension ADF node to MarkdownBlock.
 * The markdown is the concatenation of the children's markdown.
 * Generates a yamlBlock with all attributes if present.
 * @param node The bodiedExtension ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertBodiedExtension(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'bodiedExtension', ...node.attrs });
  }
  const markdown = children.map(child => child.markdown).join('');
  return { yamlBlock, markdown };
} 