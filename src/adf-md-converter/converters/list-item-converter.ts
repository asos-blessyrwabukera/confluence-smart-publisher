/**
 * Converts a listItem ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The listItem ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

/**
 * Smart content joining for list items
 * Handles nested content like paragraphs and sub-lists properly
 */
function smartJoinListItemContent(children: MarkdownBlock[]): string {
  if (children.length === 0) {return '';}
  if (children.length === 1) {return children[0].markdown;}
  
  let result = '';
  
  for (let i = 0; i < children.length; i++) {
    const current = children[i].markdown;
    const next = i < children.length - 1 ? children[i + 1].markdown : '';
    
    // Add current content
    result += current;
    
    // Determine appropriate separator
    if (next) {
      const nextTrimmed = next.trim();
      
      // Check if next is any type of list (ordered, bullet, or task)
      const isNextList = /^\s*\d+\.\s/.test(nextTrimmed) || // Ordered list (1. 2. etc.)
                        /^\s*[-*]\s/.test(nextTrimmed) ||    // Bullet list (- or *)
                        /^\s*\[[\sx]\]\s/.test(nextTrimmed); // Task list ([ ] or [x])
      
      // Check if current content contains list formatting (indented lists)
      const currentHasLists = /^\s*\d+\.\s/.test(current) || /^\s*[-*]\s/.test(current) || 
                             current.includes('\n   ') || current.includes('\n  ') || current.includes('\n      ');
      
      if (isNextList || currentHasLists) {
        // Always add line break when dealing with lists to preserve structure
        result += '\n';
      } 
      // If current is a paragraph and next is also a paragraph, add space
      else if (!current.includes('\n') && !next.includes('\n')) {
        result += ' ';
      }
      // For other cases (like paragraph followed by other blocks), add newline
      else {
        result += '\n';
      }
    }
  }
  
  return result.trim();
}

export default function convertListItem(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const markdown = smartJoinListItemContent(children);
  return { 
    markdown,
    context: { 
      hasComplexContent: children.length > 1 
    }
  };
} 