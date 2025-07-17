/**
 * Converts a tableCell ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The tableCell ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

/**
 * Smart content joining for table cells
 * Handles nested content like lists, paragraphs, code blocks properly
 */
function smartJoinCellContent(children: MarkdownBlock[]): string {
  if (children.length === 0) {return '';}
  if (children.length === 1) {
    return processListContent(children[0].markdown);
  }
  
  let result = '';
  
  for (let i = 0; i < children.length; i++) {
    const current = children[i].markdown;
    const next = i < children.length - 1 ? children[i + 1].markdown : '';
    
    // Process current content for lists
    const processedCurrent = processListContent(current);
    result += processedCurrent;
    
    // Determine appropriate separator
    if (next) {
      // If current is a list or next is a list, use <br> for proper separation
      if (isListContent(processedCurrent) || isListContent(next)) {
        result += ' <br> ';
      }
      // For paragraph content, use <br> to maintain line breaks in table
      else if (processedCurrent.includes('\n') || next.includes('\n')) {
        result += ' <br> ';
      } else {
        // For inline content, just add space
        result += ' ';
      }
    }
  }
  
  return result.trim();
}

/**
 * Processes list content to maintain proper indentation in table cells
 * Converts nested list indentation to visual indicators
 */
function processListContent(content: string): string {
  if (!isListContent(content)) {
    return content;
  }
  
  const lines = content.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) {return '';}
    
    // Count leading spaces to determine nesting level
    // For ordered lists, use 3 spaces per level; for bullet lists, use 2 spaces per level
    const leadingSpaces = line.length - line.trimStart().length;
    let nestingLevel: number;
    
    // Check if it's an ordered list item
    const orderedListMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    const bulletListMatch = trimmed.match(/^[-*]\s+(.+)/);
    
    if (orderedListMatch) {
      // Ordered list: 3 spaces per level
      nestingLevel = Math.floor(leadingSpaces / 3);
      const marker = '-'.repeat(nestingLevel + 1); // Use - -- --- for nesting levels
      const content = orderedListMatch[2]; // Content after "1. "
      return `${marker} ${content}`;
    } else if (bulletListMatch) {
      // Bullet list: 2 spaces per level  
      nestingLevel = Math.floor(leadingSpaces / 2);
      const marker = '-'.repeat(nestingLevel + 1); // Use - -- --- for nesting levels
      const content = bulletListMatch[1]; // Content after "- " or "* "
      return `${marker} ${content}`;
    }
    
    return trimmed;
  });
  
  return processedLines.filter(Boolean).join(' <br> ');
}

/**
 * Checks if content contains list items (bullet or ordered)
 */
function isListContent(content: string): boolean {
  // Check for bullet lists (- or *)
  const hasBulletList = /^\s*[-*]\s/.test(content) || content.includes('\n  -') || content.includes('\n  *');
  
  // Check for ordered lists (1. 2. etc.)
  const hasOrderedList = /^\s*\d+\.\s/.test(content) || content.includes('\n   1.') || /\n\s+\d+\.\s/.test(content);
  
  return hasBulletList || hasOrderedList;
}

/**
 * Extracts metadata for reversibility
 * @param node The table cell ADF node
 * @param children Converted children blocks
 * @returns Metadata object for reconstruction
 */
function extractCellMetadata(node: AdfNode, children: MarkdownBlock[]): Record<string, any> {
  const metadata: Record<string, any> = {};
  
  // Include cell attributes for reversibility
  if (node.attrs) {
    if (node.attrs.colspan && node.attrs.colspan !== 1) {
      metadata.colspan = node.attrs.colspan;
    }
    if (node.attrs.rowspan && node.attrs.rowspan !== 1) {
      metadata.rowspan = node.attrs.rowspan;
    }
    if (node.attrs.background) {
      metadata.background = node.attrs.background;
    }
  }
  
  // Track complex content structure for reversibility
  const hasLists = children.some(child => isListContent(child.markdown));
  const hasParagraphs = children.some(child => 
    child.adfInfo?.adfType === 'paragraph' && child.markdown.trim()
  );
  
  if (hasLists || hasParagraphs) {
    metadata.complexContent = {
      hasLists,
      hasParagraphs,
      childrenCount: children.length
    };
  }
  
  return metadata;
}

export default function convertTableCell(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const markdown = smartJoinCellContent(children);
  const metadata = extractCellMetadata(node, children);
  
  return { 
    markdown,
    context: { 
      hasComplexContent: Object.keys(metadata).length > 0,
      originalType: 'tableCell',
      needsYaml: Object.keys(metadata).length > 0
    }
  };
} 