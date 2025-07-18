/**
 * Converts $1 to markdown.
 * The markdown is a KaTeX/LaTeX block ($$ ... $$).
 * Generates a yamlBlock if there are attributes.
 * @param node The math/mathBlock/easy-math-block ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult } from '../types';
import { generateYamlBlock } from '../utils';
import * as vscode from 'vscode';

/**
 * Sanitizes LaTeX code for KaTeX compatibility.
 * 
 * KaTeX requires underscores within text commands (like \text{}) to be escaped
 * to avoid parse errors. This function automatically escapes underscores in
 * text-based LaTeX commands while preserving already escaped underscores.
 * 
 * **Examples:**
 * - `\text{VAR_NAME}` → `\text{VAR\_NAME}`
 * - `\text{ALREADY\_ESCAPED}` → `\text{ALREADY\_ESCAPED}` (unchanged)
 * - `\mathrm{SOME_VARIABLE}` → `\mathrm{SOME\_VARIABLE}`
 * 
 * @param latex The original LaTeX string
 * @returns Sanitized LaTeX string compatible with KaTeX
 */
function sanitizeLatexForKaTeX(latex: string): string {
  // List of LaTeX text commands that need underscore escaping for KaTeX compatibility
  const textCommands = ['text', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt'];
  
  let result = latex;
  
  // Process each text command
  textCommands.forEach(command => {
    const regex = new RegExp(`\\\\${command}\\{([^}]*)\\}`, 'g');
    result = result.replace(regex, (match, content) => {
      // Escape underscores that are not already escaped
      // Strategy: temporarily replace escaped underscores, escape remaining ones, then restore
      const temp = content.replace(/\\_/g, '___ESCAPED_UNDERSCORE___');
      const escaped = temp.replace(/_/g, '\\_');
      const final = escaped.replace(/___ESCAPED_UNDERSCORE___/g, '\\_');
      return `\\${command}{${final}}`;
    });
  });
  
  return result;
}

/**
 * Processes LaTeX code based on the configured math renderer.
 * 
 * This function applies different processing strategies depending on the target
 * renderer to ensure optimal compatibility and rendering quality.
 * 
 * **Configuration:** Set via `confluenceSmartPublisher.mathRenderer` in VS Code settings.
 * 
 * **Renderer options:**
 * - `katex` (default): Applies automatic sanitization for better compatibility
 * - `mathjax`: Minimal processing, preserves original syntax for broader LaTeX support  
 * - `latex`: No modifications, pure LaTeX syntax preservation
 * 
 * @param latex The original LaTeX string
 * @returns Processed LaTeX string based on renderer choice
 */
function processLatexForRenderer(latex: string): string {
  const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
  const mathRenderer = config.get('mathRenderer', 'katex') as string;

  switch (mathRenderer) {
    case 'katex':
      // Apply KaTeX-specific sanitization for better compatibility
      const sanitized = sanitizeLatexForKaTeX(latex);
      return sanitized;
    
    case 'mathjax':
      // MathJax is more tolerant - keep original syntax for better compatibility
      return latex;
    
    case 'latex':
    default:
      // Pure LaTeX - no modifications
      return latex;
  }
}

export default function convertMathBlock(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  // Extract LaTeX content from ADF node
  let latex = '';
  if (typeof node.text === 'string') {
    latex = node.text;
  } else if (Array.isArray(node.content)) {
    latex = node.content.map(child => child.text || '').join('');
  }
  
  // Process LaTeX based on configured renderer (applies KaTeX sanitization if needed)
  // This automatically fixes issues like: \text{PERC_DESC_POLITICA} → \text{PERC\_DESC\_POLITICA}
  const processedLatex = processLatexForRenderer(latex);
  
  // Generate YAML metadata block if the node has attributes
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: node.type, ...node.attrs });
  }
  
  // Create final markdown math block
  const markdown = `$$\n${processedLatex}\n$$`;
  
  return { markdown };
} 