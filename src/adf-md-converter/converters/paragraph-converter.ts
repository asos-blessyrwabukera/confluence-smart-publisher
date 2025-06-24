/**
 * Converts a paragraph ADF node to MarkdownBlock.
 * If there are extra attributes, generates a yamlBlock with adfType and attrs.
 * The markdown is the concatenation of the children's markdown.
 * @param node The paragraph ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertParagraph(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'paragraph', ...node.attrs });
  }
  const markdown = children.map(child => child.markdown).join('');
  return { yamlBlock, markdown };
}



