/**
 * Converts a table ADF node to MarkdownBlock.
 * Handles property tables and normal tables as in the legacy logic.
 * @param node The table ADF node
 * @param children The already converted children blocks (should be rows)
 * @returns MarkdownBlock
 */
import { AdfNode, MarkdownBlock } from '../types';
import { generateYamlBlock, isPropertyTable } from '../utils';

export default function convertTable(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock {
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: 'table', ...node.attrs });
  }

  // Property Table: all rows have 2 cells (1 header, 1 cell)
  if (isPropertyTable(node)) {
    let markdown = '\n';
    for (const row of children) {
      // Espera-se que cada row.markdown seja '| key | value |'
      const cells = row.markdown.split('|').map(s => s.trim()).filter(Boolean);
      if (cells.length === 2) {
        markdown += `**${cells[0]}:** ${cells[1]}\n\n`;
      }
    }
    return { yamlBlock, markdown };
  }

  // Normal Table: detect header in first row
  let markdown = '';
  if (children.length > 0) {
    // Detect header: se todos os filhos do primeiro row são tableHeader
    const firstRow = children[0];
    const headerCells = firstRow.markdown
      .replace(/^\|/,'').replace(/\|$/,'')
      .split('|').map(s => s.trim());
    if (headerCells.length > 0 && headerCells.every(cell => cell.length > 0)) {
      // Header row
      markdown += '| ' + headerCells.join(' | ') + ' |\n';
      markdown += '| ' + headerCells.map(() => '---').join(' | ') + ' |\n';
    }
    // Add remaining rows
    for (let i = 1; i < children.length; i++) {
      markdown += children[i].markdown + '\n';
    }
  }
  return { yamlBlock, markdown };
}



