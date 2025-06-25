/**
 * Converts a codeBlock ADF node to MarkdownBlock.
 * The markdown is a fenced code block with optional language and content.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The codeBlock ADF node
 * @param children The already converted children blocks (should be empty for codeBlock)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertCodeBlock(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'codeBlock', ...node.attrs });
  }
  // Extract language if present
  const language = node.attrs && typeof node.attrs.language === 'string' ? node.attrs.language : '';
  // Extract code content
  let code = '';
  if (Array.isArray(node.content)) {
    code = node.content.map(child => child.text || '').join('\n');
  } else if (typeof node.text === 'string') {
    code = node.text;
  }
  // Fallback if code is empty
  if (!code) {
    code = '';
  }
  const markdown = `\n\`\`\`${language}\n${code}\n\`\`\``;
  const adfInfo = {
    adfType: node.type,
    ...(typeof node.attrs?.localId === 'string' ? { localId: node.attrs.localId } : {}),
    ...(typeof node.attrs?.id === 'string' ? { id: node.attrs.id } : {})
  };
  return { yamlBlock, markdown, adfInfo };
} 