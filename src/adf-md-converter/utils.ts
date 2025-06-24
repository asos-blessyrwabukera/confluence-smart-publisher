/**
 * Generates a YAML block from a given object, wrapped in HTML comments.
 * @param obj Object to be stringified as YAML
 * @returns YAML block as string (with <!-- ... -->)
 */
export function generateYamlBlock(obj: Record<string, unknown>): string {
  // Simple YAML stringifier (no dependencies)
  const yaml = Object.entries(obj)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');
  return `<!--\n---\n${yaml}\n...\n-->`;
}

/**
 * Generates a slug for a heading (GitHub style, in English).
 * @param text Heading text
 * @returns Slug string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Checks if an ADF table node is a property table (all rows have exactly 2 cells: 1 header and 1 cell, in any order)
 * @param node Table node
 */
export function isPropertyTable(node: import('./types').AdfNode): boolean {
  if (!Array.isArray(node.content)) {return false;}
  return node.content.every(row => {
    if (!row || !Array.isArray(row.content)) {return false;}
    const cells = row.content;
    if (cells.length !== 2) {return false;}
    const hasHeader = cells.some(cell => cell.type === 'tableHeader');
    const hasCell = cells.some(cell => cell.type === 'tableCell');
    return hasHeader && hasCell;
  });
}

/**
 * Resolves the display text and YAML for a link node, following project rules.
 * Handles Jira, Confluence, and generic links.
 * @param url URL of the link
 * @param adfType Node type (link, blockCard, etc)
 * @param attrs Node attributes
 * @param confluenceBaseUrl Confluence base URL for context
 * @param originalType Optional original type
 * @returns { text: string, url: string, yaml: Record<string, unknown> }
 */
export function resolveLinkTextAndYaml({
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
}): { text: string; url: string; yaml: Record<string, unknown> } {
  // Helper para identificar se é Jira
  const isJira = (u: string) => /\/browse\/[A-Z]+-\d+/.test(u);
  // Helper para identificar se é Confluence
  const isConfluence = (u: string) => /\/wiki\/spaces\//.test(u);
  // Helper para extrair o final da URL tratado
  const getUrlTail = (u: string) => {
    try {
      const decoded = decodeURIComponent(u);
      const parts = decoded.split('/');
      let last = parts[parts.length - 1] || parts[parts.length - 2] || '';
      // Remove query/fragment
      last = last.split('?')[0].split('#')[0];
      // Remove hífens duplicados e substitui por espaço
      return last.replace(/[-_]+/g, ' ').replace(/\+/g, ' ').trim();
    } catch {
      return u;
    }
  };
  // Helper para comparar baseUrl
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
      // Busca de título via API não implementada aqui
      text = getUrlTail(url);
    } else {
      text = getUrlTail(url);
    }
  } else {
    text = getUrlTail(url);
  }

  // Monta YAML completo para reversão
  const yaml: Record<string, unknown> = {
    adfType,
    ...attrs,
  };
  if (originalType) {
    yaml.originalType = originalType;
  }
  return { text, url, yaml };
}



