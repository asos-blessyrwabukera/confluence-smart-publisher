/**
 * Converts panel ADF nodes to Material for MkDocs Admonition format.
 * The markdown uses the !!! admonition syntax with proper indentation.
 * @param node The panel ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

/**
 * Maps Confluence panel types to Material for MkDocs admonition types.
 * Includes all known Confluence panel types for comprehensive coverage.
 */
const panelTypeToAdmonition: Record<string, string> = {
  'info': 'info',
  'note': 'note',
  'warning': 'warning',
  'success': 'success',
  'error': 'danger',
  'tip': 'tip',
  'example': 'example',
  'quote': 'quote',
  'abstract': 'abstract',
  'failure': 'failure', 
  'bug': 'bug',
  'question': 'question',
  'custom': 'note' // Custom panels fallback to note type
};

export default function convertPanel(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const panelType = node.attrs && typeof node.attrs['panelType'] === 'string' ? node.attrs['panelType'] : '';
  const iconText = node.attrs && node.attrs['panelIconText'] ? String(node.attrs['panelIconText']) : '';
  
  // Map panel type to admonition type, default to 'note'
  const admonitionType = panelTypeToAdmonition[panelType] || 'note';
  
  // Extract title and content from children
  let title = '';
  let bodyContent = '';
  
  if (children.length > 0) {
    // Use first paragraph as title
    const firstChild = children[0];
    title = firstChild.markdown.trim();
    
    // Use remaining paragraphs as content
    if (children.length > 1) {
      bodyContent = children.slice(1).map(child => child.markdown).join('');
    }
  }
  
  // Fallback for title if first paragraph is empty
  if (!title) {
    title = iconText || panelType || admonitionType;
  }
  
  // Start building the admonition
  let md = `!!! ${admonitionType} ${title}`;
  
  if (bodyContent.trim()) {
    // Split content into lines and indent each line with 4 spaces
    const lines = bodyContent.split('\n');
    const indentedContent = lines
      .map(line => line.trim() ? `    ${line}` : '')
      .join('\n');
    
    md += `\n${indentedContent}`;
  } else {
    // Empty content case - add a blank line
    md += '\n    ';
  }
  
  return { markdown: md };
} 