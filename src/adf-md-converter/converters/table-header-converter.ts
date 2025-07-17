/**
 * Converts a tableHeader ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The tableHeader ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertTableHeader(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const text = children.map(child => child.markdown).join('');
  
  // Don't add extra ** if the text already contains strong formatting
  // This prevents issues with property tables where text already comes with **strong**
  const hasStrongFormatting = text.includes('**');
  const markdown = hasStrongFormatting ? text : `**${text}**`;
  
  return { markdown };
} 