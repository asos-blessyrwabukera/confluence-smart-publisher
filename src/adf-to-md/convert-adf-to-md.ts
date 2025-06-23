import { AdfNode, MarkdownBlock } from './adf-types';
import { generateYamlBlock } from './yaml-block-utils';
import { ConfluenceClient } from '../confluenceClient';

// Panel type to emoji map
const panelTypeIcons: Record<string, string> = {
  custom: '📝',
  warning: '⚠️',
  success: '✅',
  error: '⛔',
  info: '💡',
  note: '📝',
};

// Status color to emoji map
const statusColorIcons: Record<string, string> = {
  neutral: '⚪',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  purple: '🟣',
};

/**
 * Interface para dados CSP
 */
export interface CspData {
  file_id: string;
  labels_list: string;
  parent_id: string;
  properties: { key: string; value: string }[];
}

/**
 * Converts an ADF document node to Markdown com bloco YAML CSP opcional
 * @param node Root ADF node
 * @param cspData Dados CSP opcionais para gerar bloco YAML no início
 * @returns Markdown string
 */
export async function convertAdfToMarkdown(node: AdfNode, cspData?: CspData, confluenceBaseUrl?: string): Promise<string> {
  const cspYaml = cspData ? generateYamlBlock({ csp: cspData }) + '\n\n' : '';
  const blocks = await convertNodeAsync(node, confluenceBaseUrl || '', undefined);
  return cspYaml + blocks.map(block => {
    if (block.yamlBlock) {
      const adfTypeMatch = block.yamlBlock.match(/adfType: ?"?([\w-]+)"?/);
      const adfType = adfTypeMatch ? adfTypeMatch[1] : '';
      const endComment = `<!-- ADF-END${adfType ? ` adfType=\"${adfType}\"` : ''} -->`;
      return `${block.yamlBlock}\n${block.markdown}\n${endComment}`;
    }
    return block.markdown;
  }).join('\n\n');
}

/**
 * Recursively converts an ADF node to MarkdownBlock(s)
 * @param node ADF node
 * @returns Array of MarkdownBlock
 */
async function convertNodeAsync(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock[]> {
  if (
    node.type === 'extension' &&
    node.attrs &&
    node.attrs['extensionKey'] === 'toc' &&
    node.attrs['parameters'] &&
    (node.attrs['parameters'] as any).macroMetadata &&
    typeof (node.attrs['parameters'] as any).macroMetadata === 'object' &&
    typeof (node.attrs['parameters'] as any).macroMetadata.title === 'string'
  ) {
    const tocTitle = (node.attrs['parameters'] as any).macroMetadata.title;
    const docNode = rootNode || node;
    const headings = collectHeadings(docNode);
    const markdown = generateTocMarkdown(headings, tocTitle);
    return [{ yamlBlock: '', markdown }];
  }
  switch (node.type) {
    case 'heading':
      return [convertHeading(node)];
    case 'doc':
      return await Promise.all((node.content || []).map(child => convertNodeAsync(child, confluenceBaseUrl, node)))
        .then(blocks => blocks.flat());
    case 'paragraph':
      return [await convertParagraph(node, confluenceBaseUrl, rootNode)];
    case 'text':
      return [await convertText(node, confluenceBaseUrl, rootNode)];
    case 'bulletList':
      return [await convertBulletList(node, confluenceBaseUrl, rootNode, 0)];
    case 'orderedList':
      return [await convertOrderedList(node, confluenceBaseUrl, rootNode)];
    case 'listItem':
      return [await convertListItem(node, confluenceBaseUrl, rootNode)];
    case 'table':
      return [await convertTable(node, confluenceBaseUrl, rootNode)];
    case 'tableRow':
      return [await convertTableRow(node, confluenceBaseUrl, rootNode)];
    case 'tableHeader':
      return [await convertTableHeader(node, confluenceBaseUrl, rootNode)];
    case 'tableCell':
      return [await convertTableCell(node, confluenceBaseUrl, rootNode)];
    case 'strong':
      return [await convertStrong(node, confluenceBaseUrl, rootNode)];
    case 'code':
      return [await convertCode(node, confluenceBaseUrl, rootNode)];
    case 'link':
      return [await convertLinkAsync(node, confluenceBaseUrl, rootNode)];
    case 'codeBlock':
      return [convertCodeBlock(node)];
    case 'rule':
      return [await convertRule(node, confluenceBaseUrl, rootNode)];
    case 'expand':
      return [await convertExpand(node, confluenceBaseUrl, rootNode)];
    case 'panel':
      return [await convertPanel(node, confluenceBaseUrl, rootNode)];
    case 'status':
      return [await convertStatus(node, confluenceBaseUrl, rootNode)];
    case 'date':
      return [await convertDate(node, confluenceBaseUrl, rootNode)];
    case 'blockCard':
      return [await convertBlockCard(node, confluenceBaseUrl, rootNode)];
    case 'taskList':
      return [await convertTaskList(node, confluenceBaseUrl, rootNode)];
    case 'taskItem':
      return [await convertTaskItem(node, confluenceBaseUrl, rootNode)];
    case 'emoji':
      return [await convertEmoji(node, confluenceBaseUrl, rootNode)];
    case 'emoticon':
      return [await convertEmoji(node, confluenceBaseUrl, rootNode)];
    case 'mention':
      return [await convertMention(node, confluenceBaseUrl, rootNode)];
    case 'hardBreak':
      return [await convertHardBreak(node, confluenceBaseUrl, rootNode)];
    case 'extension':
      return [await convertExtension(node, confluenceBaseUrl, rootNode)];
    case 'bodiedExtension':
      return [await convertBodiedExtension(node, confluenceBaseUrl, rootNode)];
    case 'fragment':
      return [];
    case 'math':
      return [convertMathBlock(node)];
    case 'mathBlock':
      return [convertMathBlock(node)];
    case 'easy-math-block':
      return [convertMathBlock(node)];
    case 'inlineCard':
      return [await convertInlineCard(node, confluenceBaseUrl, rootNode)];
    case 'embedCard':
      return [await convertEmbedCard(node, confluenceBaseUrl, rootNode)];
    default:
      return [await convertNotImplemented(node, confluenceBaseUrl, rootNode)];
  }
}

/**
 * Converts a heading node to MarkdownBlock
 * Only adds YAML block if there are extra attributes besides 'level'
 * @param node Heading node
 */
function convertHeading(node: AdfNode): MarkdownBlock {
  const level = node.attrs && typeof node.attrs['level'] === 'number' ? node.attrs['level'] : 1;
  const text = (node.content && node.content[0] && node.content[0].text) || '';
  let yamlBlock = '';
  // Só adiciona YAML se houver attrs além de 'level'
  if (node.attrs && (Object.keys(node.attrs).length > 1 || (Object.keys(node.attrs).length === 1 && !('level' in node.attrs)))) {
    yamlBlock = generateYamlBlock({ adfType: 'heading', ...node.attrs });
  }
  const markdown = `${'#'.repeat(level)} ${text}`;
  return { yamlBlock, markdown };
}

/**
 * Utilitário para extrair markdown e YAML dos filhos de um nó
 * @param childBlocks Blocos filhos (resultado de convertNode)
 * @param options join: separador, prefix: prefixo por linha, listType: tipo de lista, counterStart: contador inicial
 * @returns { markdown: string, yamls: string[] }
 */
function extractMarkdownOrYamlBlocks(
  childBlocks: MarkdownBlock[],
  options?: { join?: string, prefix?: string, listType?: 'none' | 'bullet' | 'ordered', counterStart?: number }
): { markdown: string, yamls: string[] } {
  const join = options?.join ?? '';
  const prefix = options?.prefix ?? '';
  const listType = options?.listType ?? 'none';
  let counter = options?.counterStart ?? 1;

  const childMarkdowns = childBlocks.map(b => b.markdown).filter(m => m !== null);
  const childYamls = childBlocks.map(b => b.yamlBlock).filter(y => y && y.trim() !== '');

  let markdown = '';
  if (childMarkdowns.length > 0) {
    if (listType === 'bullet') {
      markdown = childMarkdowns.map(line => line.split('\n').map(l => `- ${l}`).join('\n')).join('\n');
    } else if (listType === 'ordered') {
      markdown = childMarkdowns.map(line => line.split('\n').map(l => `${counter++}. ${l}`).join('\n')).join('\n');
    } else if (prefix) {
      markdown = childMarkdowns.map(m => prefix + m).join(join);
    } else {
      markdown = childMarkdowns.join(join);
    }
  }
  return { markdown, yamls: childYamls };
}

/**
 * Tipo para funções de conversão de nós ADF com tratamento de filhos e contexto.
 */
type NodeConverter = (
  node: AdfNode,
  childResult: { markdown: string, yamls: string[] },
  confluenceBaseUrl?: string,
  rootNode?: AdfNode
) => MarkdownBlock;

/**
 * Helper to convert ADF nodes with transparent child/YAML handling.
 * Automatically processes children, concatenates their YAML blocks,
 * and passes the result to the converter function.
 *
 * @param converter Function that receives the node, child result, and context, and returns a MarkdownBlock
 * @returns Async function to be used as a node converter
 */
function withChildBlocks(converter: NodeConverter) {
  return async function(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> {
    let childResult = { markdown: '', yamls: [] as string[] };
    if (Array.isArray(node.content) && node.content.length > 0) {
      const childBlocksArr = await Promise.all(
        node.content.map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode))
      );
      const childBlocks = childBlocksArr.flat();
      childResult = extractMarkdownOrYamlBlocks(childBlocks, { join: '' });
    }
    const result = converter(node, childResult, confluenceBaseUrl, rootNode);
    let yamlBlock = result.yamlBlock;
    if (childResult.yamls.length > 0) {
      yamlBlock = [yamlBlock, ...childResult.yamls].filter(Boolean).join('\n');
    }
    return { yamlBlock, markdown: result.markdown };
  };
}

/**
 * Converts a paragraph node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertParagraph = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'paragraph', ...node.attrs });
  }
  return { yamlBlock, markdown };
});

/**
 * Converts a text node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children (if any) and concatenates their YAML blocks for reversibility.
 */
const convertText = withChildBlocks((node: AdfNode) => {
  let text = node.text || '';
  // Suporte a marks: code (inline code)
  if (Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (mark.type === 'code') {
        text = `\`${text}\``;
      }
      // TODO: tratar outros marks (bold, italic, etc) se necessário
    }
  }
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'text', ...node.attrs });
  }
  return { yamlBlock, markdown: text };
});

/**
 * Handles not implemented node types.
 * Always includes a YAML block with the original node for reversibility.
 */
const convertNotImplemented = withChildBlocks((node: AdfNode) => {
  const yamlBlock = generateYamlBlock({ adfType: 'not-implemented', originalNode: node });
  return { yamlBlock, markdown: '' };
});

/**
 * Converts a bulletList node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertBulletList = async (node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode, level: number = 0): Promise<MarkdownBlock> => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'bulletList', ...node.attrs });
  }
  const lines: string[] = [];
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (child.type === 'listItem') {
        // Converte o item normalmente
        const [itemBlock] = await convertNodeAsync(child, confluenceBaseUrl, rootNode);
        if (itemBlock) {
          if (itemBlock.yamlBlock) {
            lines.push(itemBlock.yamlBlock);
          }
          // Adiciona prefixo e indentação
          const prefix = '  '.repeat(level) + '- ';
          // Se o item contiver uma bulletList aninhada, trata separadamente
          let itemText = itemBlock.markdown;
          // Procura bulletList aninhada dentro do listItem
          if (Array.isArray(child.content)) {
            const nestedList = child.content.find(n => n.type === 'bulletList');
            if (nestedList) {
              // Remove o texto da lista aninhada do itemText
              const [mainText, ..._] = itemText.split('\n');
              itemText = mainText;
              // Converte a lista aninhada com nível + 1
              const nestedBlock = await convertBulletList(nestedList, confluenceBaseUrl, rootNode, level + 1);
              lines.push(prefix + itemText);
              lines.push(nestedBlock.markdown);
              continue;
            }
          }
          lines.push(prefix + itemText);
        }
      } else {
        // Outros tipos (não esperado, mas preserva)
        const [block] = await convertNodeAsync(child, confluenceBaseUrl, rootNode);
        if (block) {
          if (block.yamlBlock) {
            lines.push(block.yamlBlock);
          }
          lines.push(block.markdown);
        }
      }
    }
  }
  return { yamlBlock, markdown: lines.join('\n') };
};

/**
 * Converts an orderedList node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 * Garante que os itens sejam numerados corretamente em Markdown.
 */
const convertOrderedList = async (node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'orderedList', ...node.attrs });
  }
  let childBlocks: MarkdownBlock[] = [];
  if (Array.isArray(node.content) && node.content.length > 0) {
    const childBlocksArr = await Promise.all(
      node.content.map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode))
    );
    childBlocks = childBlocksArr.flat();
  }
  // Usa listType: 'ordered' para garantir numeração
  const { markdown, yamls } = extractMarkdownOrYamlBlocks(childBlocks, { join: '\n', listType: 'ordered', counterStart: (node.attrs && typeof node.attrs['order'] === 'number') ? node.attrs['order'] : 1 });
  if (yamls.length > 0) {
    yamlBlock = [yamlBlock, ...yamls].filter(Boolean).join('\n');
  }
  return { yamlBlock, markdown };
};

/**
 * Converts a listItem node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertListItem = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'listItem', ...node.attrs });
  }
  return { yamlBlock, markdown };
});

/**
 * Checks if an ADF table node is a property table (all rows have exactly 2 cells: 1 header and 1 cell, in any order)
 * @param node Table node
 */
function isPropertyTableAdf(node: AdfNode): boolean {
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
 * Converts a property table ADF node to Markdown in the format '**Key:** Value' per line (async)
 * Uses convertNodeAsync + extractMarkdownOrYamlBlocks to process children of header and cell.
 * @param node Table node
 * @param confluenceBaseUrl Base URL for context
 * @param rootNode Root node for context
 */
async function convertPropertyTableAdfAsync(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<string> {
  if (!Array.isArray(node.content)) {return '';}
  let markdown = '\n'; // Blank line before the table
  for (const row of node.content) {
    if (!row || !Array.isArray(row.content)) {continue;}
    // Encontrar header e cell na ordem correta
    let th = row.content.find(cell => cell.type === 'tableHeader');
    let td = row.content.find(cell => cell.type === 'tableCell');
    if (!th && row.content[1] && row.content[1].type === 'tableHeader') {th = row.content[1];}
    if (!td && row.content[0] && row.content[0].type === 'tableCell') {td = row.content[0];}
    let key = '';
    let value = '';
    if (th && Array.isArray(th.content)) {
      const thBlocksArr = await Promise.all(th.content.map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
      const thBlocks = thBlocksArr.flat();
      key = extractMarkdownOrYamlBlocks(thBlocks, { join: ' ' }).markdown.replace(/\n/g, ' ').trim();
    }
    if (td && Array.isArray(td.content)) {
      const tdBlocksArr = await Promise.all(td.content.map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
      const tdBlocks = tdBlocksArr.flat();
      value = extractMarkdownOrYamlBlocks(tdBlocks, { join: ' ' }).markdown.replace(/\n/g, ' ').trim();
    }
    if (key || value) {
      markdown += `**${key}:** ${value}\n\n`;
    }
  }
  return markdown;
}

/**
 * Converts a normal (non-property) table ADF node to Markdown table format (async)
 * Uses convertNodeAsync + extractMarkdownOrYamlBlocks to process children of each cell.
 * @param node Table node
 * @param confluenceBaseUrl Base URL for context
 * @param rootNode Root node for context
 */
async function convertNormalTableAdfAsync(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<string> {
  if (!Array.isArray(node.content)) {return '';} // rows
  let markdown = '';
  // Detect header row (first row: all tableHeader or tableCell)
  const firstRow = node.content[0];
  let hasHeader = false;
  let headerCells: string[] = [];
  if (firstRow && Array.isArray(firstRow.content)) {
    const headerCellPromises = firstRow.content
      .map(async cell => {
        if (Array.isArray(cell.content)) {
          const blocksArr = await Promise.all(cell.content.map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
          const blocks = blocksArr.flat();
          return extractMarkdownOrYamlBlocks(blocks, { join: '' }).markdown.replace(/\n/g, ' ').trim();
        }
        return '';
      });
    headerCells = await Promise.all(headerCellPromises);
    hasHeader = firstRow.content.every(cell => cell.type === 'tableHeader' || cell.type === 'tableCell');
  }
  if (hasHeader) {
    markdown += '| ' + headerCells.join(' | ') + ' |\n';
    markdown += '| ' + headerCells.map(() => '---').join(' | ') + ' |\n';
  }
  // Process all rows (skip header row if present)
  for (let idx = 0; idx < node.content.length; idx++) {
    const row = node.content[idx];
    if (!row || !Array.isArray(row.content)) {continue;}
    if (hasHeader && idx === 0) {continue;}
    const cellPromises = row.content
      .map(async cell => {
        if (Array.isArray(cell.content)) {
          const blocksArr = await Promise.all(cell.content.map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
          const blocks = blocksArr.flat();
          return extractMarkdownOrYamlBlocks(blocks, { join: '' }).markdown.replace(/\n/g, ' ').trim();
        }
        return '';
      });
    const cells = await Promise.all(cellPromises);
    if (cells.length > 0) {
      markdown += '| ' + cells.join(' | ') + ' |\n';
    }
  }
  return '\n' + markdown + '\n';
}

/**
 * Converts a table node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 * If the table is a property table, uses the property table format.
 */
const convertTable = async (node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'table', ...node.attrs });
  }
  if (isPropertyTableAdf(node)) {
    const markdown = await convertPropertyTableAdfAsync(node, confluenceBaseUrl, rootNode);
    return { yamlBlock, markdown };
  }
  // Se não for property table, converte como tabela tradicional (async)
  const markdown = await convertNormalTableAdfAsync(node, confluenceBaseUrl, rootNode);
  return { yamlBlock, markdown };
};

/**
 * Converts a tableRow node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertTableRow = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'tableRow', ...node.attrs });
  }
  return { yamlBlock, markdown };
});

/**
 * Converts a tableHeader node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertTableHeader = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'tableHeader', ...node.attrs });
  }
  return { yamlBlock, markdown };
});

/**
 * Converts a tableCell node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertTableCell = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'tableCell', ...node.attrs });
  }
  return { yamlBlock, markdown };
});

/**
 * Converts a strong node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertStrong = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'strong', ...node.attrs });
  }
  return { yamlBlock, markdown: `**${markdown}**` };
});

/**
 * Converts a code node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertCode = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'code', ...node.attrs });
  }
  return { yamlBlock, markdown: `\`${markdown}\`` };
});

/**
 * Utilitário para extrair o texto do link conforme regras do projeto
 * @param url URL do link
 * @param adfType Tipo do nó ADF (link, blockCard, etc)
 * @param attrs Atributos do nó
 * @param confluenceBaseUrl Base URL do Confluence configurado
 * @returns { text: string, url: string, yaml: Record<string, unknown> }
 */
async function resolveLinkTextAndYaml({
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

// Adaptação para async: convertLink
async function convertLinkAsync(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> {
  const childBlocks = await Promise.all((node.content || []).map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
  const href = node.attrs && typeof node.attrs['href'] === 'string' ? node.attrs['href'] as string : '';
  const { text, url, yaml } = await resolveLinkTextAndYaml({
    url: href,
    adfType: 'link',
    attrs: node.attrs || {},
    confluenceBaseUrl,
    originalType: 'link',
  });
  const yamlBlock = generateYamlBlock(yaml);
  return { yamlBlock, markdown: `[${text}](${url})` };
}

// Adaptação para async: convertBlockCard
async function convertBlockCard(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> {
  const url = node.attrs && typeof node.attrs['url'] === 'string' ? node.attrs['url'] as string : '';
  const { text, url: finalUrl, yaml } = await resolveLinkTextAndYaml({
    url,
    adfType: 'blockCard',
    attrs: node.attrs || {},
    confluenceBaseUrl,
    originalType: 'blockCard',
  });
  const childBlocksArr = await Promise.all((node.content || []).map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
  const childBlocks = childBlocksArr.flat();
  const childText = extractMarkdownOrYamlBlocks(childBlocks, { join: '' }).markdown;
  let linkText = text;
  if (childText.trim()) {
    linkText = childText;
  }
  const yamlBlock = generateYamlBlock(yaml);
  return { yamlBlock, markdown: `[${linkText}](${finalUrl})` };
}

/**
 * Converts a rule node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertRule = withChildBlocks((node: AdfNode) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'rule', ...node.attrs });
  }
  return { yamlBlock, markdown: '---' };
});

/**
 * Converts an expand node to MarkdownBlock.
 * Always adds YAML block for reversibility.
 * Handles children de forma assíncrona para garantir correta conversão de blocos como codeBlock.
 */
const convertExpand = async (node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> => {
  const title = node.attrs && node.attrs['title'] ? String(node.attrs['title']) : '';
  const yamlBlock = generateYamlBlock({ adfType: 'expand', ...node.attrs });
  let markdown = '';
  if (Array.isArray(node.content) && node.content.length > 0) {
    const childBlocksArr = await Promise.all(
      node.content.map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode))
    );
    const childBlocks = childBlocksArr.flat();
    markdown = extractMarkdownOrYamlBlocks(childBlocks, { join: '' }).markdown;
  }
  return { yamlBlock, markdown: `> **${title}**\n\n${markdown}` };
};

/**
 * Converts a panel node to MarkdownBlock.
 * Always adds YAML block for reversibility.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertPanel = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  const yamlBlock = generateYamlBlock({ adfType: 'panel', ...node.attrs });
  const panelType = node.attrs && typeof node.attrs['panelType'] === 'string' ? node.attrs['panelType'] : '';
  const icon = panelTypeIcons[panelType] || '';
  const iconText = node.attrs && node.attrs['panelIconText'] ? String(node.attrs['panelIconText']) : '';

  // Divide o markdown dos filhos em parágrafos (linhas)
  const paragraphs = markdown.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  let md = '';
  if (paragraphs.length > 0) {
    // Primeiro parágrafo recebe ícone/texto
    if (icon && iconText) {
      md = `> ${icon} ${iconText}: ${paragraphs[0]}`;
    } else if (icon) {
      md = `> ${icon}: ${paragraphs[0]}`;
    } else if (iconText) {
      md = `> ${iconText}: ${paragraphs[0]}`;
    } else {
      md = `> ${paragraphs[0]}`;
    }
    // Demais parágrafos apenas prefixados com '>'
    for (let i = 1; i < paragraphs.length; i++) {
      md += `\n> ${paragraphs[i]}`;
    }
  } else {
    md = '> ';
  }
  return { yamlBlock, markdown: md };
});

/**
 * Converte o texto para Title Case (primeira letra maiúscula em cada palavra)
 */
function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Converts a status node to MarkdownBlock.
 * Generates markdown in the format '<icon>: <text>' according to the color attribute, without YAML block.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertStatus = withChildBlocks((node: AdfNode) => {
  const textRaw = (node.attrs && typeof node.attrs['text'] === 'string') ? node.attrs['text'] : (node.text || '');
  const text = toTitleCase(textRaw);
  const color = node.attrs && typeof node.attrs['color'] === 'string' ? node.attrs['color'] : '';
  const icon = statusColorIcons[color] || '';
  const markdown = icon ? `${icon} ${text}` : text;
  return { yamlBlock: '', markdown };
});

/**
 * Converts a date node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertDate = withChildBlocks((node: AdfNode) => {
  let text = node.text || '';
  if (!text && node.attrs && typeof node.attrs['timestamp'] === 'string') {
    const timestamp = Number(node.attrs['timestamp']);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp);
      text = date.toISOString().slice(0, 10);
    }
  }
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'date', ...node.attrs });
  }
  return { yamlBlock, markdown: text };
});

/**
 * Converts a taskList node to MarkdownBlock.
 * Processa manualmente cada filho (taskItem), incluindo YAML e linha Markdown corretamente.
 * O YAML do próprio taskList é preservado.
 */
const convertTaskList = async (node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'taskList', ...node.attrs });
  }
  const lines: string[] = [];
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (child.type === 'taskItem') {
        const state = child.attrs && child.attrs['state'] === 'DONE' ? 'x' : ' ';
        // Usa convertNodeAsync para processar o taskItem (que usa o helper para os filhos)
        const [taskBlock] = await convertNodeAsync(child, confluenceBaseUrl, rootNode);
        if (taskBlock) {
          if (taskBlock.yamlBlock) {
            lines.push(`${taskBlock.yamlBlock}`);
          }
          lines.push(`[${state}] ${taskBlock.markdown}`.trim());
        }
      } else {
        // Outros tipos (não esperado, mas preserva)
        const [block] = await convertNodeAsync(child, confluenceBaseUrl, rootNode);
        if (block) {
          if (block.yamlBlock) {
            lines.push(`${block.yamlBlock}`);
          }
          lines.push(block.markdown.trim());
        }
      }
    }
  }
  return { yamlBlock, markdown: lines.join('\n') };
};

/**
 * Converts a taskItem node to MarkdownBlock.
 * Retorna apenas o texto da tarefa (sem prefixo [ ] ou [x]).
 * Mantém YAML se houver attrs extras.
 */
const convertTaskItem = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'taskItem', ...node.attrs });
  }
  // O texto da tarefa pode estar em node.content[0].text ou em markdown
  let text = markdown;
  if (!text && node.content && node.content[0] && node.content[0].text) {
    text = node.content[0].text;
  }
  return { yamlBlock, markdown: text };
});

/**
 * Converts an emoji or emoticon node to MarkdownBlock.
 * Always saves YAML with emoji id and uses text for Markdown.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertEmoji = withChildBlocks((node: AdfNode) => {
  let text = '';
  let id = '';
  if (node.attrs) {
    if (typeof node.attrs['text'] === 'string') {
      text = node.attrs['text'] as string;
    }
    if (typeof node.attrs['id'] === 'string') {
      id = node.attrs['id'] as string;
    }
  }
  if (text.startsWith(':')) {
    const emojiShortNameMap: Record<string, string> = {
      ':x:': '❌', ':check_mark:': '✔️', ':smile:': '😃', ':sad:': '😢', ':wink:': '😉', ':laugh:': '😆', ':angry:': '😠', ':thumbs_up:': '��', ':thumbs_down:': '👎', ':blush:': '��', ':surprised:': '😮', ':cry:': '😭', ':cool:': '😎',
    };
    text = emojiShortNameMap[text] || text;
  }
  let yamlBlock = '';
  if (id) {
    yamlBlock = generateYamlBlock({ adfType: 'emoji', id });
  } else if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'emoji', ...node.attrs });
  }
  return { yamlBlock, markdown: text };
});

/**
 * Converts a hardBreak node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertHardBreak = withChildBlocks((node: AdfNode) => {
  const text = node.text || '';
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'hardBreak', ...node.attrs });
  }
  return { yamlBlock, markdown: text };
});

/**
 * Converts an extension node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertExtension = withChildBlocks((node: AdfNode) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'extension', ...node.attrs });
  }
  return { yamlBlock, markdown: '' };
});

/**
 * Converts a bodiedExtension node to MarkdownBlock.
 * Adds YAML block if there are extra attributes.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertBodiedExtension = withChildBlocks((node: AdfNode, { markdown }: { markdown: string }) => {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'bodiedExtension', ...node.attrs });
  }
  // Inclui o markdown dos filhos (ex: tabelas de propriedades)
  return { yamlBlock, markdown };
});

/**
 * Utilitário para gerar slug de heading (formato GitHub)
 */
function generateSlug(text: string): string {
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
 * Coleta todos os headings do documento ADF
 */
function collectHeadings(node: AdfNode, headings: { level: number; text: string; slug: string }[] = []): { level: number; text: string; slug: string }[] {
  if (node.type === 'heading') {
    const level = node.attrs && typeof node.attrs['level'] === 'number' ? node.attrs['level'] : 1;
    const text = (node.content && node.content[0] && node.content[0].text) || '';
    const slug = generateSlug(text);
    headings.push({ level, text, slug });
  }
  if (Array.isArray(node.content)) {
    node.content.forEach(child => collectHeadings(child, headings));
  }
  return headings;
}

/**
 * Gera o índice (TOC) em Markdown aninhado
 */
function generateTocMarkdown(headings: { level: number; text: string; slug: string }[], tocTitle: string): string {
  let markdown = `# ${tocTitle}\n`;
  let prevLevel = 1;
  headings.forEach(({ level, text, slug }) => {
    const indent = '  '.repeat(level - 1);
    markdown += `\n${indent}- [${text}](#${slug})`;
    prevLevel = level;
  });
  return markdown;
}

/**
 * Converts a math/mathBlock/easy-math-block node to MarkdownBlock
 * Gera bloco KaTeX/LaTeX ($$ ... $$) e YAML se houver atributos extras
 * @param node math node
 */
function convertMathBlock(node: AdfNode): MarkdownBlock {
  // Extrai o conteúdo do nó (pode estar em node.text ou em node.content)
  let latex = '';
  if (typeof node.text === 'string') {
    latex = node.text;
  } else if (Array.isArray(node.content)) {
    // Concatena textos dos filhos
    latex = node.content.map(child => child.text || '').join('');
  }
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: node.type, ...node.attrs });
  }
  const markdown = `$$\n${latex}\n$$`;
  return { yamlBlock, markdown };
}

// Corrigir chamada de convertCodeBlock para manter compatibilidade
function convertCodeBlock(node: AdfNode): MarkdownBlock {
  const code = (node.content || []).map(child => {
    if (child.type === 'text') {
      return child.text || '';
    }
    return '';
  }).join('');
  const language = node.attrs && node.attrs['language'] ? String(node.attrs['language']) : '';
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 1) {
    yamlBlock = generateYamlBlock({ adfType: 'codeBlock', ...node.attrs });
  } else if (node.attrs && Object.keys(node.attrs).length === 1 && !('language' in node.attrs)) {
    yamlBlock = generateYamlBlock({ adfType: 'codeBlock', ...node.attrs });
  }
  // Remove quebras de linha extras no início/fim
  const codeTrimmed = code.replace(/^\n+|\n+$/g, '');
  const markdown = `\n\n\
\`\`\`${language ? language : ''}\n${codeTrimmed}\n\`\`\`\n`;
  return { yamlBlock, markdown };
}

// Função para inlineCard
async function convertInlineCard(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> {
  const url = node.attrs && typeof node.attrs['url'] === 'string' ? node.attrs['url'] as string : '';
  const { text, url: finalUrl, yaml } = await resolveLinkTextAndYaml({
    url,
    adfType: 'inlineCard',
    attrs: node.attrs || {},
    confluenceBaseUrl,
    originalType: 'inlineCard',
  });
  const childBlocksArr = await Promise.all((node.content || []).map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
  const childBlocks = childBlocksArr.flat();
  const childText = extractMarkdownOrYamlBlocks(childBlocks, { join: '' }).markdown;
  let linkText = text;
  if (childText.trim()) {
    linkText = childText;
  }
  const yamlBlock = generateYamlBlock(yaml);
  return { yamlBlock, markdown: `[${linkText}](${finalUrl})` };
}

// Função para embedCard
async function convertEmbedCard(node: AdfNode, confluenceBaseUrl: string, rootNode?: AdfNode): Promise<MarkdownBlock> {
  const url = node.attrs && typeof node.attrs['url'] === 'string' ? node.attrs['url'] as string : '';
  const { text, url: finalUrl, yaml } = await resolveLinkTextAndYaml({
    url,
    adfType: 'embedCard',
    attrs: node.attrs || {},
    confluenceBaseUrl,
    originalType: 'embedCard',
  });
  const childBlocksArr = await Promise.all((node.content || []).map(child => convertNodeAsync(child, confluenceBaseUrl, rootNode)));
  const childBlocks = childBlocksArr.flat();
  const childText = extractMarkdownOrYamlBlocks(childBlocks, { join: '' }).markdown;
  let linkText = text;
  if (childText.trim()) {
    linkText = childText;
  }
  const yamlBlock = generateYamlBlock(yaml);
  return { yamlBlock, markdown: `[${linkText}](${finalUrl})` };
}

/**
 * Converts a mention node to MarkdownBlock.
 * Always saves YAML with all mention attributes for reversibility.
 * Handles children and concatenates their YAML blocks for reversibility.
 */
const convertMention = withChildBlocks((node: AdfNode) => {
  const text = node.attrs && typeof node.attrs['text'] === 'string' ? node.attrs['text'] : '';
  const yamlBlock = generateYamlBlock({ adfType: 'mention', ...node.attrs });
  return { yamlBlock, markdown: text };
});