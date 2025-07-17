/**
 * Converts an extension ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The extension ADF node
 * @param children The already converted children blocks (should be empty)
 * @param level Not used for extensions
 * @param confluenceBaseUrl Not used for extensions
 * @param documentContext Document context for extensions that need it (like TOC)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult, DocumentContext } from '../types';
import convertToc from './toc-converter';

/**
 * Generates a human-readable fallback for extensions based on their type
 * @param node The extension ADF node
 * @returns A readable markdown representation
 */
function generateExtensionFallback(node: AdfNode): string {
  const extensionKey = node.attrs?.extensionKey as string;
  const extensionType = node.attrs?.extensionType as string;
  const parameters = node.attrs?.parameters as any;
  
  // Mermaid Diagrams
  if (extensionKey?.includes('mermaid') || node.attrs?.text === 'Mermaid diagram') {
    return `📊 **Mermaid Diagram**\n\n*(Diagram content preserved in metadata for re-conversion)*`;
  }
  
  // Math/LaTeX
  if (extensionKey === 'easy-math-block' || extensionKey?.includes('math')) {
    const mathBody = parameters?.macroParams?.body?.value;
    if (mathBody) {
      return `🧮 **Mathematical Formula:**\n\n$$\n${mathBody}\n$$`;
    }
    return `🧮 **Mathematical Formula**\n\n*(Formula preserved in metadata)*`;
  }
  
  // Jira Issues
  if (extensionKey?.includes('jira') || extensionType?.includes('jira')) {
    return `🎯 **Jira Issues**\n\n*(Issue query preserved in metadata)*`;
  }
  
  // Children Display
  if (extensionKey === 'children' || extensionKey?.includes('child')) {
    return `📄 **Child Pages**\n\n*(Will display child pages when published)*`;
  }
  
  // Attachments
  if (extensionKey === 'attachments' || extensionKey?.includes('attachment')) {
    return `📎 **Attachments**\n\n*(Will display page attachments when published)*`;
  }
  
  // Info/Note/Warning Panels (if somehow they come as extensions)
  if (extensionKey?.includes('info') || extensionKey?.includes('note')) {
    return `💡 **Information Panel**\n\n*(Content preserved in metadata)*`;
  }
  
  // Code/Syntax Highlighting
  if (extensionKey?.includes('code') || extensionKey?.includes('highlight')) {
    return `💻 **Code Block**\n\n*(Code preserved in metadata)*`;
  }
  
  // Include/Excerpt
  if (extensionKey?.includes('include') || extensionKey?.includes('excerpt')) {
    return `📥 **Content Include**\n\n*(Reference preserved in metadata)*`;
  }
  
  // Generic fallback with extension info
  const title = node.attrs?.text || 
                parameters?.macroMetadata?.title || 
                extensionKey || 
                'Extension';
  
  return `⚙️ **${title}**\n\n*(Extension: ${extensionKey || 'unknown'} - Content preserved in metadata)*`;
}

export default function convertExtension(
  node: AdfNode, 
  children: MarkdownBlock[], 
  level?: number, 
  confluenceBaseUrl?: string, 
  documentContext?: DocumentContext
): ConverterResult {
  const extensionKey = node.attrs?.extensionKey as string;
  const extensionType = node.attrs?.extensionType as string;
  
  // Use specific TOC converter when it's a TOC extension
  if (extensionKey === 'toc' || extensionType?.includes('toc')) {
    return convertToc(node, children, level, confluenceBaseUrl, documentContext);
  }
  
  // Generate human-readable fallback for other extensions
  const fallbackMarkdown = generateExtensionFallback(node);
  
  // YAML generation handled by central logic based on CRITICAL_ATTRIBUTES
  // extension nodes always need YAML as they have ['*'] in CRITICAL_ATTRIBUTES
  return { markdown: fallbackMarkdown };
} 