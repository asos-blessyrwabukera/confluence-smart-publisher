/**
 * Converts a mention ADF node to MarkdownBlock.
 * The markdown is the mention text.
 * Generates a yamlBlock with all attributes.
 * @param node The mention ADF node
 * @param children The already converted children blocks (should be empty)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertMention(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  const text = node.attrs && typeof node.attrs['text'] === 'string' ? node.attrs['text'] as string : '';
  const yamlBlock = generateYamlBlock({ adfType: 'mention', ...node.attrs });
  return { yamlBlock, markdown: text };
} 