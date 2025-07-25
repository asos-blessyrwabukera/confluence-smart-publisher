/**
 * Converts a doc ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The doc ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertDoc(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const markdown = children.map(child => child.markdown).join('\n\n');
  return { markdown };
} 