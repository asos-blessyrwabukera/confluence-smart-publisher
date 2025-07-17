/**
 * Converts a bodiedExtension ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The bodiedExtension ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

/**
 * Generates a human-readable fallback for bodied extensions based on their type
 * @param node The bodied extension ADF node
 * @param children The converted children content
 * @returns A readable markdown representation
 */
function generateBodiedExtensionFallback(node: AdfNode, children: MarkdownBlock[]): string {
  const extensionKey = node.attrs?.extensionKey as string;
  const extensionType = node.attrs?.extensionType as string;
  const parameters = node.attrs?.parameters as any;
  const childContent = children.map(child => child.markdown).join('\n');
  
  // Expand/Collapse sections
  if (extensionKey === 'expand' || extensionKey?.includes('expand')) {
    const title = parameters?.macroParams?.title?.value || 'Expandable Section';
    return `> **${title}**\n\n${childContent}`;
  }
  
  // Details/Summary sections
  if (extensionKey === 'details' || extensionKey?.includes('detail')) {
    const title = parameters?.macroParams?.title?.value || 'Details';
    return `<details>\n<summary>${title}</summary>\n\n${childContent}\n</details>`;
  }
  
  // Code blocks with content
  if (extensionKey?.includes('code') && childContent) {
    const language = parameters?.macroParams?.language?.value || '';
    return `\`\`\`${language}\n${childContent}\n\`\`\``;
  }
  
  // Quote/Excerpt with content  
  if (extensionKey?.includes('quote') || extensionKey?.includes('excerpt')) {
    return `> ${childContent.replace(/\n/g, '\n> ')}`;
  }
  
  // Note/Info panels with content
  if (extensionKey?.includes('info') || extensionKey?.includes('note')) {
    const panelType = extensionKey.includes('warning') ? '⚠️' : 
                     extensionKey.includes('error') ? '⛔' : '💡';
    return `> ${panelType} **Note:**\n> \n> ${childContent.replace(/\n/g, '\n> ')}`;
  }
  
  // Layout sections - just return content with separator
  if (extensionKey?.includes('layout') || extensionKey?.includes('column')) {
    return `---\n\n${childContent}\n\n---`;
  }
  
  // Generic bodied extension - include content with context
  const title = node.attrs?.text || 
                parameters?.macroMetadata?.title || 
                extensionKey || 
                'Extension';
  
  if (childContent) {
    return `⚙️ **${title}**\n\n${childContent}\n\n*(Extension: ${extensionKey || 'unknown'} - Metadata preserved)*`;
  } else {
    return `⚙️ **${title}**\n\n*(Extension: ${extensionKey || 'unknown'} - Content preserved in metadata)*`;
  }
}

export default function convertBodiedExtension(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  // Generate human-readable fallback with content
  const fallbackMarkdown = generateBodiedExtensionFallback(node, children);
  
  // YAML generation handled by central logic based on CRITICAL_ATTRIBUTES
  // bodiedExtension nodes always need YAML as they have ['*'] in CRITICAL_ATTRIBUTES
  return { markdown: fallbackMarkdown };
} 