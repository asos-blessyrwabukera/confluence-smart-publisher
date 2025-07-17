/**
 * Converts a tableRow ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The tableRow ADF node
 * @param children The already converted children blocks (should be cells)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertTableRow(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const markdown = '| ' + children.map(child => child.markdown).join(' | ') + ' |';
  return { markdown };
} 