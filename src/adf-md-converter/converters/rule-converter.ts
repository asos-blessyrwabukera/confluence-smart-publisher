/**
 * Converts a rule ADF node to MarkdownBlock.
 * The markdown is a horizontal rule (---).
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The rule ADF node
 * @param children The already converted children blocks (should be empty for rule)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertRule(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'rule', ...node.attrs });
  }
  const markdown = '\n---\n';
  return { yamlBlock, markdown };
} 