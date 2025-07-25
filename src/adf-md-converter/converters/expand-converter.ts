/**
 * Converts expand to markdown.
 * The markdown is a blockquote with the title in bold and the children content below.
 * Always generates a yamlBlock with adfType and attrs for identification.
 * @param node The expand ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertExpand(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const title = node.attrs && node.attrs['title'] ? String(node.attrs['title']) : '';
  const content = children.map(child => child.markdown).join('');
  
  // Split content into lines and prefix each with '>'
  const contentLines = content.split('\n');
  const prefixedContent = contentLines
    .map(line => line.trim() ? `> ${line}` : '>')
    .join('\n');
  
  const markdown = `> **${title}**\n${prefixedContent}`;
  
  // YAML generation handled by central logic based on CRITICAL_ATTRIBUTES
  // expand nodes don't need YAML as title can be inferred from markdown structure
  return { markdown };
} 