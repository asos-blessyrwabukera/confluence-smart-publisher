/**
 * Converts a code ADF node to markdown (inline code).
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The code ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertCode(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const text = children.map(child => child.markdown).join('');
  const markdown = `\`${text}\``;
  return { markdown };
} 