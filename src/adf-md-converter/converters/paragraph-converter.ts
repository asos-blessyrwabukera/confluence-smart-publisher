/**
 * Converts a paragraph ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The paragraph ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertParagraph(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const markdown = children.map(child => child.markdown).join('');
  return { markdown };
}