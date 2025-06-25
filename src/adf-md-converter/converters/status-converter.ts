/**
 * Converts a status ADF node to MarkdownBlock.
 * The markdown is an icon (from iconMaps) and the status text.
 * Generates a yamlBlock if there are attributes.
 * @param node The status ADF node
 * @param children The already converted children blocks (should be empty for status)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock, iconMaps } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertStatus(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  const textRaw = node.attrs && typeof node.attrs['text'] === 'string' ? node.attrs['text'] : (node.text || '');
  const text = textRaw.charAt(0).toUpperCase() + textRaw.slice(1);
  const color = node.attrs && typeof node.attrs['color'] === 'string' ? node.attrs['color'] : '';
  const icon = iconMaps[color] || '';
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'status', ...node.attrs });
  }
  const markdown = icon ? `${icon} ${text}` : text;
  const adfInfo = {
    adfType: node.type,
    ...(typeof node.attrs?.localId === 'string' ? { localId: node.attrs.localId } : {}),
    ...(typeof node.attrs?.id === 'string' ? { id: node.attrs.id } : {})
  };
  return { yamlBlock, markdown, adfInfo };
} 