/**
 * Converts a heading ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The heading ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertHeading(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const level = node.attrs && typeof node.attrs['level'] === 'number' ? node.attrs['level'] : 1;
  const text = children.map(child => child.markdown).join('');
  const markdown = `${'#'.repeat(level)} ${text}`;
  return { markdown };
}



