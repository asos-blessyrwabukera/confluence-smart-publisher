/**
 * Converts orderedList to markdown.
 * Generates a Markdown ordered list, handling item numbering, possible 'order' attribute, and indentation for nesting.
 * If there are attributes, generates a yamlBlock with adfType and attrs.
 * @param node The orderedList ADF node
 * @param children The already converted children blocks (should be listItems)
 * @param level The nesting level (default 0)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { generateYamlBlock } from '../utils';

/**
 * Renders ordered list with proper indentation and numbering for nested lists
 * @param children List item children blocks
 * @param level Nesting level (0 = top level)
 * @param startNumber Starting number for the list
 * @returns Formatted markdown string
 */
function renderOrderedList(children: MarkdownBlock[], level: number = 0, startNumber: number = 1): string {
  const indent = '   '.repeat(level); // 3 spaces per level for ordered lists
  let counter = startNumber;
  
  return children
    .map(child => {
      const lines = child.markdown.split('\n');
      let result = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {continue;} // Skip empty lines
        
        if (i === 0) {
          // First line gets the number
          result += `${indent}${counter}. ${line}`;
          counter++;
        } else {
          // Subsequent lines: if it's a nested list (starts with number.), keep as-is
          // Otherwise, indent to align with the content of the first line
          if (/^\d+\./.test(line)) {
            // This is a nested ordered list, preserve original indentation
            const originalLine = lines[i]; // Get line with original indentation
            result += `\n${originalLine}`;
          } else if (line.startsWith('-') || line.startsWith('*')) {
            // This is a nested bullet list, preserve original indentation
            const originalLine = lines[i]; // Get line with original indentation
            result += `\n${originalLine}`;
          } else {
            // Regular content, align with first line content (3 spaces for number + '. ')
            result += `\n${indent}   ${line}`;
          }
        }
      }
      
      return result;
    })
    .join('\n');
}

export default function convertOrderedList(node: AdfNode, children: MarkdownBlock[], level: number = 0): ConverterResult {
  const start = node.attrs && typeof node.attrs['order'] === 'number' ? node.attrs['order'] : 1;
  const markdown = renderOrderedList(children, level, start);
  
  return { 
    markdown,
    context: { 
      hasComplexContent: level > 0 || children.some(child => child.markdown.includes('\n'))
    }
  };
} 