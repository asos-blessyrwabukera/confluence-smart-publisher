/**
 * Converts a strong ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The strong ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertStrong(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const text = children.map(child => child.markdown).join('');
  const markdown = `**${text}**`;
  return { markdown };
} 