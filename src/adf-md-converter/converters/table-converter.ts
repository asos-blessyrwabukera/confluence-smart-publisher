/**
 * Converts a table ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The table ADF node
 * @param children The already converted children blocks (should be rows)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { isPropertyTable } from '../utils';

/**
 * Removes extra formatting from property table keys
 * @param text Text that may have extra ** formatting
 * @returns Clean text for property tables
 */
function cleanPropertyKey(text: string): string {
  // Remove extra ** formatting, but keep the content
  return text.replace(/^\*\*|\*\*$/g, '').trim();
}

export default function convertTable(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  // Property Table: all rows have 2 cells (1 header, 1 cell)
  if (isPropertyTable(node)) {
    let markdown = '\n';
    for (const row of children) {
      // Espera-se que cada row.markdown seja '| key | value |'
      const cells = row.markdown.split('|').map(s => s.trim()).filter(Boolean);
      if (cells.length === 2) {
        // Clean the key (remove extra ** formatting) and format properly
        const cleanKey = cleanPropertyKey(cells[0]);
        markdown += `**${cleanKey}:** ${cells[1]}\n\n`;
      }
    }
    return { 
      markdown,
      context: { hasComplexContent: true }
    };
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
  
  return { 
    markdown,
    context: { hasComplexContent: children.length > 0 }
  };
}



