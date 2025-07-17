/**
 * Converts a hardBreak ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The hardBreak ADF node
 * @param children The already converted children blocks (should be empty)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertHardBreak(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const markdown = '\n';
  return { markdown };
} 