/**
 * Converts a tableRow ADF node to MarkdownBlock.
 * The markdown is the concatenation of the children's markdown, separated by '|', wrapped with '|'.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The tableRow ADF node
 * @param children The already converted children blocks (should be cells)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertTableRow(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'tableRow', ...node.attrs });
  }
  const markdown = '| ' + children.map(child => child.markdown).join(' | ') + ' |';
  const adfInfo = {
    adfType: node.type,
    ...(typeof node.attrs?.localId === 'string' ? { localId: node.attrs.localId } : {}),
    ...(typeof node.attrs?.id === 'string' ? { id: node.attrs.id } : {})
  };
  return { yamlBlock, markdown, adfInfo };
} 