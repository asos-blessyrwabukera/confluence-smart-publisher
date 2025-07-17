/**
 * Converts $1 to markdown.
 * The markdown is a KaTeX/LaTeX block ($$ ... $$).
 * Generates a yamlBlock if there are attributes.
 * @param node The math/mathBlock/easy-math-block ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertMathBlock(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  let latex = '';
  if (typeof node.text === 'string') {
    latex = node.text;
  } else if (Array.isArray(node.content)) {
    latex = node.content.map(child => child.text || '').join('');
  }
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: node.type, ...node.attrs });
  }
  const markdown = `$$\n${latex}\n$$`;
  return { markdown };
} 