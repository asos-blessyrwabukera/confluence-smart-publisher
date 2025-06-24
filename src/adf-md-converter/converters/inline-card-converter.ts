/**
 * Converts an inlineCard ADF node to MarkdownBlock.
 * Uses resolveLinkTextAndYaml for consistent link title and YAML logic.
 * @param node The inlineCard ADF node
 * @param children The already converted children blocks (should be empty for inlineCard)
 * @param _level (ignored)
 * @param confluenceBaseUrl Base URL for Confluence context
 * @returns Promise<MarkdownBlock>
 */
import { AdfNode, MarkdownBlock } from '../types';
import { resolveLinkTextAndYaml } from '../link-utils';

export default async function convertInlineCard(
  node: AdfNode,
  children: MarkdownBlock[],
  _level?: number,
  confluenceBaseUrl: string = ''
): Promise<MarkdownBlock> {
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
    adfType: 'inlineCard',
    attrs: node.attrs || {},
    confluenceBaseUrl,
    originalType: 'inlineCard',
  });
  const markdown = `[${text}](${resolvedUrl})`;
  const yamlBlock = yaml ? `<!--\n---\n${Object.entries(yaml).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n...\n-->` : '';
  return { yamlBlock, markdown };
} 