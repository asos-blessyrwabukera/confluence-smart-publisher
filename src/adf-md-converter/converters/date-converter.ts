/**
 * Converts date to markdown.
 * The markdown is the date in YYYY-MM-DD format.
 * YAML generation is handled centrally.
 * @param node The date ADF node
 * @param children The already converted children blocks (should be empty for date)
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';

export default function convertDate(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  let text = node.text || '';
  
  if (!text && node.attrs && typeof node.attrs['timestamp'] === 'string') {
    const timestampStr = node.attrs['timestamp'];
    let date: Date;
    
    // Try to parse as number first (Unix timestamp)
    const timestampNum = Number(timestampStr);
    if (!isNaN(timestampNum)) {
      date = new Date(timestampNum);
    } else {
      // Try to parse as date string (ISO format, etc.)
      date = new Date(timestampStr);
    }
    
    // Only use the parsed date if it's valid
    if (!isNaN(date.getTime())) {
      text = date.toISOString().slice(0, 10);
    }
  }
  
  return { markdown: text };
} 