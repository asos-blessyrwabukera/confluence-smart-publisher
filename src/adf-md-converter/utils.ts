/**
 * Types that always need YAML blocks for reversibility, regardless of attributes
 */
const ALWAYS_NEEDS_YAML = new Set([
  'extension',
  'bodiedExtension', 
  'not-implemented',
  'blockCard',
  'inlineCard',
  'embedCard',
  'toc'
]);

/**
 * Critical attributes that are essential for reversibility by ADF node type
 */
const CRITICAL_ATTRIBUTES: Record<string, string[]> = {
  // Table elements - only critical layout attributes
  table: ['width', 'layout'],
  tableCell: ['colspan', 'rowspan', 'background', 'hasComplexContent', 'contentType'],
  tableHeader: ['colspan', 'rowspan', 'background'],
  tableRow: [], // Usually no critical attributes
  
  // Extensions always need full data
  extension: ['*'], // All attributes are critical
  bodiedExtension: ['*'], // All attributes are critical
  
  // Media and complex elements
  mediaSingle: ['layout', 'width', 'widthType'],
  media: ['collection', 'id', 'type', 'alt'],
  
  // Panels with custom attributes
  panel: ['panelType', 'panelColor', 'panelIconId', 'panelIcon', 'panelIconText'],
  
  // Lists with special attributes
  bulletList: [], // Standard lists don't need YAML
  orderedList: [], // Order can be inferred from first number in markdown
  
  // Elements that can be fully inferred from markdown
  heading: [], // Level can be inferred from # count
  paragraph: [], // Standard paragraphs don't need YAML
  text: [], // Text with marks can be inferred
  strong: [], // Can be inferred from **text**
  code: [], // Can be inferred from `code`
  codeBlock: [], // Language can be inferred from ```language syntax
  status: [], // Color and text can be inferred from emoji + text
  emoji: [], // Can be inferred from emoji itself
  date: [], // Can be inferred from formatted date
  hardBreak: [], // Can be inferred from line break
  
  // Links - only need YAML for special attributes
  link: [], // Standard links don't need YAML
  blockCard: ['*'],
  inlineCard: ['*'],
  embedCard: ['layout', 'width'], // Layout attributes are critical
  
  // Task items
  taskList: [], // Standard task lists don't need YAML
  taskItem: [], // State can be inferred from [ ] or [x] in markdown
  
  // Special cases
  expand: [], // Title can be inferred from markdown structure
  mention: ['id', 'text'], // ID is critical for mentions
  toc: ['*'], // TOC has many parameters that cannot be inferred from markdown
  
  // Not implemented - always needs YAML
  'not-implemented': ['*']
};

/**
 * Generates a unique local ID for ADF elements
 * @returns Unique local ID string
 */
function generateLocalId(): string {
  return `adf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Checks if a YAML block should be generated based on reversibility needs
 * @param adfType The ADF node type
 * @param attrs The node attributes
 * @param context Additional context for decision making
 * @returns true if YAML block is needed for reversibility
 */
function shouldGenerateYamlBlock(
  adfType: string, 
  attrs: Record<string, unknown>, 
  context: { hasComplexContent?: boolean; originalType?: string }
): boolean {
  // Types that always need YAML blocks for reversibility
  if (ALWAYS_NEEDS_YAML.has(adfType)) {
    return true;
  }

  // If we have an originalType different from current type, we need YAML
  if (context.originalType && context.originalType !== adfType) {
    return true;
  }

  // Get critical attributes for this node type
  const criticalAttrs = CRITICAL_ATTRIBUTES[adfType] || [];
  
  // If all attributes are critical, we need YAML only if we have attributes
  if (criticalAttrs.includes('*')) {
    return Object.keys(attrs).length > 0;
  }

  // Check if any critical attributes are present
  const hasCriticalAttrs = criticalAttrs.some(attr => {
    const value = attrs[attr];
    
    // Special cases for specific attributes
    if (attr === 'order' && value === 1) {
      return false; // order=1 is default, don't need YAML
    }
    
    if (attr === 'state' && (value === 'TODO' || value === 'DONE')) {
      return false; // Standard states don't need YAML
    }
    
    return value !== undefined && value !== null;
  });

  // Additional logic for complex content
  if (context.hasComplexContent) {
    // Complex tables with nested content might need YAML
    if (['table', 'tableCell', 'tableHeader'].includes(adfType)) {
      return hasCriticalAttrs;
    }
  }

  return hasCriticalAttrs;
}

/**
 * Generates an optimized YAML block from a given object, but only if necessary for reversibility
 * Combines ADF-START delimiter with YAML metadata in a single comment for better readability
 * @param obj Object containing adfType and attributes
 * @param context Additional context for decision making
 * @returns YAML block as string (with <!-- ADF-START ... -->) or empty string
 */
export function generateYamlBlock(
  obj: Record<string, unknown>, 
  context?: { hasComplexContent?: boolean; originalType?: string }
): string {
  const { adfType, ...attrs } = obj;
  
  if (!adfType || typeof adfType !== 'string') {
    return ''; // Invalid input, no YAML needed
  }

  // Provide default context if not provided
  const ctx = context || {};

  // Check if YAML block is necessary
  if (!shouldGenerateYamlBlock(adfType, attrs, ctx)) {
    return '';
  }

  // Filter out non-critical attributes for cleaner YAML
  const criticalAttrs = CRITICAL_ATTRIBUTES[adfType] || [];
  let filteredObj: Record<string, unknown>;

  if (criticalAttrs.includes('*')) {
    // Keep all attributes (except adfType - it's in START/END)
    filteredObj = { ...attrs };
  } else {
    // Keep only critical attributes (no adfType - it's in START/END)
    filteredObj = {};
    criticalAttrs.forEach(attr => {
      if (attrs[attr] !== undefined) {
        filteredObj[attr] = attrs[attr];
      }
    });
    
    // Always keep originalType if present
    if (ctx.originalType) {
      filteredObj.originalType = ctx.originalType;
    }
  }

  // Extract or generate identifier for consistency between START and END comments
  let localId = (attrs.localId as string) || (attrs.id as string);
  
  // Generate localId if not present - critical for parsing nested structures
  if (!localId) {
    localId = `adf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // Generate YAML only if we have meaningful content (after removing adfType/localId redundancy)
  // Exception: Types that always need YAML for reversibility should generate blocks even without attributes
  if (Object.keys(filteredObj).length === 0 && !ALWAYS_NEEDS_YAML.has(adfType)) {
    return ''; // No meaningful attributes, not worth a YAML block
  }
  
  // Simple YAML stringifier (no dependencies) - excludes adfType and localId (they're in START/END)
  const yaml = Object.entries(filteredObj)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');
  
  // Optimized format: ADF-START with identifier and YAML metadata
  const startTag = `ADF-START\nadfType="${adfType}"\nlocalId="${localId}"`;
  
  // If no YAML content but type always needs block, just include the START tag
  if (yaml.length === 0) {
    return `<!-- ${startTag}\n-->`;
  }
    
  return `<!-- ${startTag}\n${yaml}\n-->`;
}

/**
 * Generates an ADF-END comment block to close an ADF section
 * @param obj Object containing adfType and attributes (should match the opening block)
 * @returns ADF-END comment string or empty string if no closing needed
 */
export function generateAdfEndBlock(obj: Record<string, unknown>): string {
  const { adfType, localId, id } = obj;
  
  if (!adfType || typeof adfType !== 'string') {
    return ''; // Invalid input, no closing needed
  }

  // All elements with YAML blocks now have localId (generated if needed)
  const identifier = (localId as string) || (id as string) || 'unknown';
  return `<!-- ADF-END adfType="${adfType}" localId="${identifier}" -->`;
}

/**
 * Helper function to extract localId from a YAML block string
 * @param yamlBlock The YAML block string generated by generateYamlBlock
 * @returns localId or empty string
 */
export function extractLocalIdFromYamlBlock(yamlBlock: string): string {
  if (!yamlBlock.includes('localId')) {
    return '';
  }
  
  const match = yamlBlock.match(/localId:\s*"([^"]+)"/);
  return match ? match[1] : '';
}

/**
 * Helper function to create a smart YAML block for ADF nodes
 * @param node The ADF node
 * @param context Additional context
 * @returns YAML block string or empty string
 */
export function createSmartYamlBlock(
  node: import('./types').AdfNode,
  context?: { hasComplexContent?: boolean; originalType?: string }
): string {
  if (!node.attrs || Object.keys(node.attrs).length === 0) {
    // No attributes, check if we still need YAML for the type itself
    return generateYamlBlock({ adfType: node.type }, context);
  }

  return generateYamlBlock({ adfType: node.type, ...node.attrs }, context);
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
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (compatible with ES5)
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
  if (!Array.isArray(node.content)) {
    return false;
  }
  return node.content.every(row => {
    if (!row || !Array.isArray(row.content)) {
      return false;
    }
    const cells = row.content;
    if (cells.length !== 2) {
      return false;
    }
    const hasHeader = cells.some(cell => cell.type === 'tableHeader');
    const hasCell = cells.some(cell => cell.type === 'tableCell');
    return hasHeader && hasCell;
  });
}

/**
 * Resolves the display text and YAML for a link node, following project rules.
 * Handles Jira, Confluence, and generic links.
 * @param params Object with URL, type, attributes, and context
 * @returns Object with text, url, and yaml
 */
export function resolveLinkTextAndYaml(params: {
  url: string;
  adfType: string;
  attrs: Record<string, unknown>;
  confluenceBaseUrl: string;
  originalType?: string;
}): { text: string; url: string; yaml: Record<string, unknown> } {
  const { url, adfType, attrs, confluenceBaseUrl, originalType } = params;
  
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



