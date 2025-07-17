/**
 * Converts bulletList to markdown.
 * Generates a Markdown unordered list, handling nested lists with indentation.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The bulletList ADF node
 * @param children The already converted children blocks (should be listItems)
 * @param level The nesting level (default 0)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { generateYamlBlock } from '../utils';

/**
 * Renders bullet list with proper indentation for nested lists
 * @param children List item children blocks
 * @param level Nesting level (0 = top level)
 * @returns Formatted markdown string
 */
function renderBulletList(children: MarkdownBlock[], level: number = 0): string {
  const indent = '  '.repeat(level); // 2 spaces per level
  const bulletChar = level % 2 === 0 ? '-' : '*'; // Alternate between - and * for different levels
  
  return children
    .map(child => {
      const lines = child.markdown.split('\n');
      let result = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {continue;} // Skip empty lines
        
        if (i === 0) {
          // First line gets the bullet
          result += `${indent}${bulletChar} ${line}`;
        } else {
          // Subsequent lines: if it's a nested list (starts with - or *), preserve original indentation
          // Otherwise, indent to align with the content of the first line
          if (line.startsWith('-') || line.startsWith('*')) {
            // This is a nested list, preserve the original indentation from the line
            const originalLine = lines[i]; // Get line with original indentation
            result += `\n${originalLine}`;
          } else {
            // Regular content, align with first line content
            result += `\n${indent}  ${line}`;
          }
        }
      }
      
      return result;
    })
    .join('\n');
}

export default function convertBulletList(node: AdfNode, children: MarkdownBlock[], level: number = 0): ConverterResult {
  const markdown = renderBulletList(children, level);
  
  return { 
    markdown,
    context: { 
      hasComplexContent: level > 0 || children.some(child => child.markdown.includes('\n'))
    }
  };
} 