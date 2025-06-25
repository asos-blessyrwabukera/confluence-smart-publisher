/**
 * Converts an extension ADF node to MarkdownBlock.
 * The markdown is empty.
 * Generates a yamlBlock with all attributes if present.
 * @param node The extension ADF node
 * @param children The already converted children blocks (should be empty)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertExtension(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'extension', ...node.attrs });
  }
  const adfInfo = {
    adfType: node.type,
    ...(typeof node.attrs?.localId === 'string' ? { localId: node.attrs.localId } : {}),
    ...(typeof node.attrs?.id === 'string' ? { id: node.attrs.id } : {})
  };
  return { yamlBlock, markdown: '', adfInfo };
} 