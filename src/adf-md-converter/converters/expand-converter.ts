/**
 * Converts an expand ADF node to MarkdownBlock.
 * The markdown is a blockquote with the title in bold and the children content below.
 * Always generates a yamlBlock with adfType and attrs.
 * @param node The expand ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertExpand(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  const title = node.attrs && node.attrs['title'] ? String(node.attrs['title']) : '';
  const yamlBlock = generateYamlBlock({ adfType: 'expand', ...node.attrs });
  const content = children.map(child => child.markdown).join('');
  const markdown = `> **${title}**\n\n${content}`;
  const adfInfo = {
    adfType: node.type,
    ...(typeof node.attrs?.localId === 'string' ? { localId: node.attrs.localId } : {}),
    ...(typeof node.attrs?.id === 'string' ? { id: node.attrs.id } : {})
  };
  return { yamlBlock, markdown, adfInfo };
} 