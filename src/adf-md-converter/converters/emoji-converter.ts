/**
 * Converts an emoji/emoticon ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The emoji/emoticon ADF node
 * @param children The already converted children blocks (should be empty)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult, iconMaps } from '../types';

export default function convertEmoji(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  let text = '';
  if (node.attrs) {
    if (typeof node.attrs['text'] === 'string') {
      text = node.attrs['text'] as string;
    }
  }
  if (text.startsWith(':')) {
    const shortname = text.replace(/:/g, '');
    text = iconMaps[shortname] || text;
  }
  
  return { markdown: text };
} 