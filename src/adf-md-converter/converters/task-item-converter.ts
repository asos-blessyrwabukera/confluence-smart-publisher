/**
 * Converts a taskItem ADF node to MarkdownBlock.
 * The markdown is '[x] text' if state is 'DONE', or '[ ] text' otherwise.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The taskItem ADF node
 * @param children The already converted children blocks
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock } from '../utils';

export default function convertTaskItem(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'taskItem', ...node.attrs });
  }
  const state = node.attrs && node.attrs['state'] === 'DONE' ? 'x' : ' ';
  let text = children.map(child => child.markdown).join('');
  if (!text && node.content && node.content[0] && node.content[0].text) {
    text = node.content[0].text;
  }
  const markdown = `[${state}] ${text}`;
  return { yamlBlock, markdown };
} 