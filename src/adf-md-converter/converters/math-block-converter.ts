/**
 * Converts a math/mathBlock/easy-math-block ADF node to MarkdownBlock.
 * The markdown is a KaTeX/LaTeX block ($$ ... $$).
 * Generates a yamlBlock if there are attributes.
 * @param node The math/mathBlock/easy-math-block ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertMathBlock(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
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
  const adfInfo = {
    adfType: node.type,
    ...(typeof node.attrs?.localId === 'string' ? { localId: node.attrs.localId } : {}),
    ...(typeof node.attrs?.id === 'string' ? { id: node.attrs.id } : {})
  };
  return { yamlBlock, markdown, adfInfo };
} 