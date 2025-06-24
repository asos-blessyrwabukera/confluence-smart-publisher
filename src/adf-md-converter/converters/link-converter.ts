/**
 * Converts a link ADF node to MarkdownBlock.
 * Uses resolveLinkTextAndYaml for advanced link/text logic, including Confluence API lookup.
 * @param node The link ADF node
 * @param children The already converted children blocks
 * @param _level (ignored)
 * @param confluenceBaseUrl Base URL do Confluence para contexto
 * @returns Promise<MarkdownBlock>
 */
import { AdfNode, MarkdownBlock } from '../types';
import { resolveLinkTextAndYaml } from '../link-utils';

export default async function convertLink(
  node: AdfNode,
  children: MarkdownBlock[],
  _level?: number,
  confluenceBaseUrl: string = ''
): Promise<MarkdownBlock> {
  const href = node.attrs && typeof node.attrs['href'] === 'string' ? node.attrs['href'] : '';
  const textFromChildren = children.map(child => child.markdown).join('');
  const { text, url, yaml } = await resolveLinkTextAndYaml({
    url: href,
    adfType: 'link',
    attrs: node.attrs || {},
    confluenceBaseUrl,
    originalType: 'link',
  });
  // Se houver texto nos filhos, prioriza ele
  const linkText = textFromChildren.trim() ? textFromChildren : text;
  const yamlBlock = yaml ? `<!--\n---\n${Object.entries(yaml).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n...\n-->` : '';
  return { yamlBlock, markdown: `[${linkText}](${url})` };
} 