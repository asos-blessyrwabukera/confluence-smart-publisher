/**
 * Converts $1 to markdown.
 * Uses resolveLinkTextAndYaml for consistent link title and YAML logic.
 * @param node The embedCard ADF node
 * @param children The already converted children blocks (should be empty for embedCard)
 * @param _level (ignored)
 * @param confluenceBaseUrl Base URL for Confluence context
 * @returns Promise<MarkdownBlock>
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { resolveLinkTextAndYaml } from '../link-utils';

export default async function convertEmbedCard(
  node: AdfNode,
  children: MarkdownBlock[],
  _level?: number,
  confluenceBaseUrl: string = ''
): Promise<ConverterResult> {
  // Extract url from node.attrs or node.attrs.data
  let url = '';
  if (node.attrs) {
    if (typeof node.attrs.url === 'string') {
      url = node.attrs.url;
    } else if (
      typeof node.attrs.data === 'object' &&
      node.attrs.data !== null &&
      typeof (node.attrs.data as Record<string, unknown>).url === 'string'
    ) {
      url = (node.attrs.data as Record<string, unknown>).url as string;
    }
  }
  const { text, url: resolvedUrl, yaml } = await resolveLinkTextAndYaml({
    url,
    adfType: 'embedCard',
    attrs: node.attrs || {},
    confluenceBaseUrl,
    originalType: 'embedCard',
  });
  const markdown = `[${text}](${resolvedUrl})`;
  
  // YAML generation handled by central logic based on CRITICAL_ATTRIBUTES
  // embedCard needs YAML only if it has 'layout' or 'width' attributes
  return { markdown };
} 