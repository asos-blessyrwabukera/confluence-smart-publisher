/**
 * Converts $1 to markdown.
 * Uses resolveLinkTextAndYaml for advanced link/text logic, including Confluence API lookup.
 * @param node The link ADF node
 * @param children The already converted children blocks
 * @param _level (ignored)
 * @param confluenceBaseUrl Base URL do Confluence para contexto
 * @returns Promise<MarkdownBlock>
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { resolveLinkTextAndYaml } from '../link-utils';

export default async function convertLink(
  node: AdfNode,
  children: MarkdownBlock[],
  _level?: number,
  confluenceBaseUrl: string = ''
): Promise<ConverterResult> {
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
  
  // YAML generation handled by central logic based on CRITICAL_ATTRIBUTES
  // link nodes don't need YAML for standard attributes (only href)
  return { markdown: `[${linkText}](${url})` };
} 