/**
 * Async utility to resolve display text and YAML for a link node, including Confluence API title lookup.
 */
import { ConfluenceClient } from '../confluenceClient';

export async function resolveLinkTextAndYaml({
  url,
  adfType,
  attrs,
  confluenceBaseUrl,
  originalType
}: {
  url: string;
  adfType: string;
  attrs: Record<string, unknown>;
  confluenceBaseUrl: string;
  originalType?: string;
}): Promise<{ text: string; url: string; yaml: Record<string, unknown> }> {
  const isJira = (u: string) => /\/browse\/[A-Z]+-\d+/.test(u);
  const isConfluence = (u: string) => /\/wiki\/spaces\//.test(u);
  const getUrlTail = (u: string) => {
    try {
      const decoded = decodeURIComponent(u);
      const parts = decoded.split('/');
      let last = parts[parts.length - 1] || parts[parts.length - 2] || '';
      last = last.split('?')[0].split('#')[0];
      return last.replace(/[-_]+/g, ' ').replace(/\+/g, ' ').trim();
    } catch {
      return u;
    }
  };
  const isSameConfluenceServer = (u: string, base: string) => {
    try {
      const urlObj = new URL(u);
      const baseObj = new URL(base);
      return urlObj.host === baseObj.host;
    } catch {
      return false;
    }
  };

  let text = '';
  if (isJira(url)) {
    text = getUrlTail(url);
  } else if (isConfluence(url)) {
    if (isSameConfluenceServer(url, confluenceBaseUrl)) {
      // Buscar título via API
      const match = url.match(/\/pages\/(\d+)/);
      if (match) {
        const pageId = match[1];
        try {
          const client = new ConfluenceClient();
          const page = await client.getPageById(pageId);
          if (page && page.title) {
            text = page.title;
          } else {
            text = getUrlTail(url);
          }
        } catch {
          text = getUrlTail(url);
        }
      } else {
        text = getUrlTail(url);
      }
    } else {
      text = getUrlTail(url);
    }
  } else {
    text = getUrlTail(url);
  }

  const yaml: Record<string, unknown> = {
    adfType,
    ...attrs,
  };
  if (originalType) {
    yaml.originalType = originalType;
  }
  return { text, url, yaml };
} 