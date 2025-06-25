/**
 * Converts a hardBreak ADF node to MarkdownBlock.
 * The markdown is a line break (\n).
 * Generates a yamlBlock if there are attributes.
 * @param node The hardBreak ADF node
 * @param children The already converted children blocks (should be empty)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertHardBreak(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  const text = '\n';
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'hardBreak', ...node.attrs });
  }
  const adfInfo = {
    adfType: node.type,
    ...(typeof node.attrs?.localId === 'string' ? { localId: node.attrs.localId } : {}),
    ...(typeof node.attrs?.id === 'string' ? { id: node.attrs.id } : {})
  };
  return { yamlBlock, markdown: text, adfInfo };
} 