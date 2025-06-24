/**
 * Converts an emoji or emoticon ADF node to MarkdownBlock.
 * The markdown is the emoji unicode (from iconMaps) or the text.
 * Generates a yamlBlock with id or attributes if present.
 * @param node The emoji/emoticon ADF node
 * @param children The already converted children blocks (should be empty)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock, iconMaps } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertEmoji(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let text = '';
  let id = '';
  if (node.attrs) {
    if (typeof node.attrs['text'] === 'string') {
      text = node.attrs['text'] as string;
    }
    if (typeof node.attrs['id'] === 'string') {
      id = node.attrs['id'] as string;
    }
  }
  if (text.startsWith(':')) {
    const shortname = text.replace(/:/g, '');
    text = iconMaps[shortname] || text;
  }
  let yamlBlock = '';
  if (id) {
    yamlBlock = generateYamlBlock({ adfType: 'emoji', id });
  } else if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'emoji', ...node.attrs });
  }
  return { yamlBlock, markdown: text };
} 