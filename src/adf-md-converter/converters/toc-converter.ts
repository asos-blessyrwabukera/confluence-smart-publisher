/**
 * Converts a Table of Contents (TOC) extension ADF node to markdown.
 * Analyzes document headings and generates a real TOC based on all available parameters.
 * Supports all Confluence TOC macro features: type, style, outline, separator, filters, etc.
 * @param node The TOC extension ADF node
 * @param children The already converted children blocks (should be empty)
 * @param level Not used for TOC
 * @param confluenceBaseUrl Base URL for absolute links
 * @param documentContext Document context containing all nodes for heading analysis
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult, DocumentContext, HeadingInfo } from '../types';
import { generateSlug } from '../utils';

/**
 * Interface for TOC parameters matching Confluence macro options
 */
interface TocParameters {
  type: 'list' | 'flat';
  outline: boolean;
  style: string;
  indent: string;
  separator: string;
  minLevel: number;
  maxLevel: number;
  include: string;
  exclude: string;
  printable: boolean;
  cssClass: string;
  absoluteUrl: boolean;
}

/**
 * Extracts heading text from a heading node's content recursively
 */
function extractHeadingText(headingNode: AdfNode): string {
  if (!Array.isArray(headingNode.content)) {
    return '';
  }

  return headingNode.content
    .map(contentNode => {
      if (contentNode.type === 'text') {
        return contentNode.text || '';
      }
      // Handle other inline elements like links, strong, em, etc.
      if (contentNode.type === 'strong' && Array.isArray(contentNode.content)) {
        return extractHeadingText(contentNode);
      }
      if (contentNode.type === 'link' && Array.isArray(contentNode.content)) {
        return extractHeadingText(contentNode);
      }
      if (contentNode.type === 'em' && Array.isArray(contentNode.content)) {
        return extractHeadingText(contentNode);
      }
      return '';
    })
    .join('')
    .trim();
}



/**
 * Tests if heading text matches include/exclude regex patterns
 */
function matchesPattern(text: string, pattern: string): boolean {
  if (!pattern) {
    return true;
  }
  
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  } catch (error) {
    // Invalid regex, treat as literal string match
    return text.toLowerCase().includes(pattern.toLowerCase());
  }
}

/**
 * Extracts all headings from document nodes with filtering
 */
function extractHeadings(
  allNodes: AdfNode[], 
  params: TocParameters
): HeadingInfo[] {
  const headings: HeadingInfo[] = [];

  for (const node of allNodes) {
    if (node.type === 'heading') {
      const level = (node.attrs?.level as number) || 1;
      
      // Filter by level range
      if (level >= params.minLevel && level <= params.maxLevel) {
        const text = extractHeadingText(node);
        if (text) {
          // Apply include/exclude filters
          const includeMatch = matchesPattern(text, params.include);
          const excludeMatch = params.exclude ? matchesPattern(text, params.exclude) : false;
          
          if (includeMatch && !excludeMatch) {
            headings.push({
              level,
              text,
              slug: generateSlug(text),
              localId: node.attrs?.localId as string
            });
          }
        }
      }
    }
  }

  return headings;
}

/**
 * Generates hierarchical numbering for outline mode
 */
function generateOutlineNumbers(headings: HeadingInfo[]): string[] {
  const numbers: string[] = [];
  const counters = new Map<number, number>();

  for (const heading of headings) {
    const level = heading.level;
    
    // Reset counters for deeper levels
    for (const [counterLevel] of counters) {
      if (counterLevel > level) {
        counters.delete(counterLevel);
      }
    }
    
    // Increment counter for current level
    const currentCount = (counters.get(level) || 0) + 1;
    counters.set(level, currentCount);
    
    // Build hierarchical number (e.g., "1.2.1")
    const numberParts: string[] = [];
    const sortedLevels = Array.from(counters.keys()).sort((a, b) => a - b);
    
    for (const counterLevel of sortedLevels) {
      if (counterLevel <= level) {
        numberParts.push(counters.get(counterLevel)!.toString());
      }
    }
    
    numbers.push(numberParts.join('.'));
  }

  return numbers;
}

/**
 * Gets the bullet style based on the style parameter
 */
function getBulletStyle(style: string, level: number): string {
  switch (style.toLowerCase()) {
    case 'none':
      return '';
    case 'disc':
      return '•';
    case 'circle':
      return '◦';
    case 'square':
      return '▪';
    case 'decimal':
      return '1.';
    case 'lower-alpha':
      return String.fromCharCode(97 + (level % 26)) + '.';
    case 'upper-alpha':
      return String.fromCharCode(65 + (level % 26)) + '.';
    case 'lower-roman':
      return toRomanNumeral(level + 1).toLowerCase() + '.';
    case 'upper-roman':
      return toRomanNumeral(level + 1) + '.';
    case 'default':
    default:
      // Confluence default: different styles per level
      const defaultStyles = ['•', '◦', '▪', '▫'];
      return defaultStyles[level % defaultStyles.length];
  }
}

/**
 * Converts number to Roman numeral
 */
function toRomanNumeral(num: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  
  let result = '';
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += numerals[i];
      num -= values[i];
    }
  }
  return result;
}

/**
 * Generates list-type TOC markdown
 */
function generateListToc(
  headings: HeadingInfo[], 
  params: TocParameters,
  confluenceBaseUrl?: string
): string {
  if (headings.length === 0) {
    return '*No headings found in the specified criteria.*';
  }

  let markdown = '';
  const baseLevel = Math.min(...headings.map(h => h.level));
  const outlineNumbers = params.outline ? generateOutlineNumbers(headings) : [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const relativeLevel = heading.level - baseLevel;
    
    // Calculate indentation
    const baseIndent = params.indent ? parseInt(params.indent.replace(/\D/g, ''), 10) || 0 : 0;
    const totalIndent = baseIndent + (relativeLevel * 20); // 20px per level by default
    const indentStr = '  '.repeat(relativeLevel);

    // Generate link URL
    const linkUrl = params.absoluteUrl && confluenceBaseUrl 
      ? `${confluenceBaseUrl}#${heading.slug}`
      : `#${heading.slug}`;

    // Build list item
    let listItem = indentStr;
    
    if (params.outline && outlineNumbers[i]) {
      // Outline numbering mode
      listItem += `${outlineNumbers[i]} [${heading.text}](${linkUrl})`;
    } else {
      // Regular bullet or custom style
      const bullet = getBulletStyle(params.style, relativeLevel);
      if (bullet && !params.style.includes('alpha') && !params.style.includes('roman') && !params.style.includes('decimal')) {
        listItem += `${bullet} [${heading.text}](${linkUrl})`;
      } else {
        listItem += `- [${heading.text}](${linkUrl})`;
      }
    }

    markdown += listItem + '\n\n';
  }

  return markdown.trim();
}

/**
 * Generates flat-type TOC markdown (horizontal menu)
 */
function generateFlatToc(
  headings: HeadingInfo[], 
  params: TocParameters,
  confluenceBaseUrl?: string
): string {
  if (headings.length === 0) {
    return '*No headings found*';
  }

  const links = headings.map(heading => {
    const linkUrl = params.absoluteUrl && confluenceBaseUrl 
      ? `${confluenceBaseUrl}#${heading.slug}`
      : `#${heading.slug}`;
    return `[${heading.text}](${linkUrl})`;
  });

  // Apply separator
  let separator = ' | ';
  switch (params.separator.toLowerCase()) {
    case 'brackets':
      return links.map(link => `[${link}]`).join(' ');
    case 'braces':
      return links.map(link => `{${link}}`).join(' ');
    case 'parens':
      return links.map(link => `(${link})`).join(' ');
    case 'pipe':
      separator = ' | ';
      break;
    default:
      // Custom separator
      if (params.separator && params.separator !== 'brackets' && params.separator !== 'braces' && params.separator !== 'parens' && params.separator !== 'pipe') {
        separator = params.separator;
      }
  }

  return links.join(separator);
}

/**
 * Parses TOC parameters from ADF node
 */
function parseTocParameters(node: AdfNode): TocParameters {
  const parameters = node.attrs?.parameters as any;
  const macroParams = parameters?.macroParams || {};

  return {
    type: (macroParams.type?.value || 'list') as 'list' | 'flat',
    outline: macroParams.outline?.value === 'true',
    style: macroParams.style?.value || 'default',
    indent: macroParams.indent?.value || '',
    separator: macroParams.separator?.value || 'pipe',
    minLevel: parseInt(macroParams.minLevel?.value || '1', 10),
    maxLevel: parseInt(macroParams.maxLevel?.value || '6', 10),
    include: macroParams.include?.value || '',
    exclude: macroParams.exclude?.value || '',
    printable: macroParams.printable?.value !== 'false',
    cssClass: macroParams.class?.value || '',
    absoluteUrl: macroParams.absoluteUrl?.value === 'true'
  };
}

/**
 * Main TOC converter function
 */
export default function convertToc(
  node: AdfNode, 
  children: MarkdownBlock[], 
  level?: number, 
  confluenceBaseUrl?: string, 
  documentContext?: DocumentContext
): ConverterResult {
  const params = parseTocParameters(node);
  let markdown = '';

  if (!documentContext) {
    // Fallback if no document context available
    const typeDesc = params.type === 'flat' ? 'horizontal menu' : 'hierarchical list';
    const levelDesc = `levels ${params.minLevel}-${params.maxLevel}`;
    const filterDesc = params.include ? ` matching "${params.include}"` : '';
    
    markdown = `*(${typeDesc}, ${levelDesc}${filterDesc})*\n\n> **Note:** TOC will be generated automatically by Confluence based on page headings.`;
  } else {
    // Generate real TOC from document headings
    const headings = extractHeadings(documentContext.allNodes, params);
    
    if (params.type === 'flat') {
      markdown = generateFlatToc(headings, params, confluenceBaseUrl);
    } else {
      markdown = generateListToc(headings, params, confluenceBaseUrl);
    }
  }

  // Add CSS class wrapper if specified
  if (params.cssClass) {
    markdown = `<div class="${params.cssClass}">\n\n${markdown}\n\n</div>`;
  }

  // Add printable note if not printable
  if (!params.printable) {
    markdown += '\n\n> *This table of contents is set to not appear in print mode.*';
  }
  
  // YAML generation handled by central logic based on CRITICAL_ATTRIBUTES
  // toc nodes always need YAML to preserve all parameters
  return { markdown };
} 