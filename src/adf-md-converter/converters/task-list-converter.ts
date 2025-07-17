/**
 * Converts a taskList ADF node to markdown.
 * YAML generation is handled centrally by AdfToMarkdownConverter.
 * @param node The taskList ADF node
 * @param children The already converted children blocks (should be taskItems)
 * @param level The nesting level (default 0)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertTaskList(node: AdfNode, children: MarkdownBlock[], level: number = 0): ConverterResult {
  // Cada child.markdown já deve ser '[ ] texto' ou '[x] texto', só aplicar indentação
  const markdown = children
    .map(child => child.markdown
      .split('\n')
      .map(line => line.trim() ? `${'  '.repeat(level)}${line}` : '')
      .join('\n')
    )
    .join('\n');
  return { markdown };
} 