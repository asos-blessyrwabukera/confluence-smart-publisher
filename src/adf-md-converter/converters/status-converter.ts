/**
 * Converts a status ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The status ADF node
 * @param children The already converted children blocks (should be empty for status)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult, iconMaps } from '../types';

export default function convertStatus(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const textRaw = node.attrs && typeof node.attrs['text'] === 'string' ? node.attrs['text'] : (node.text || '');
  const text = textRaw.charAt(0).toUpperCase() + textRaw.slice(1);
  const color = node.attrs && typeof node.attrs['color'] === 'string' ? node.attrs['color'] : '';
  const icon = iconMaps[color] || '';
  const markdown = icon ? `${icon} ${text}` : text;
  
  return { markdown };
} 