/**
 * Converts $1 to markdown.
 * The markdown is the mention text.
 * Generates a yamlBlock with all attributes.
 * @param node The mention ADF node
 * @param children The already converted children blocks (should be empty)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertMention(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const text = node.attrs && typeof node.attrs['text'] === 'string' ? node.attrs['text'] as string : '';
  return { markdown: text };
} 