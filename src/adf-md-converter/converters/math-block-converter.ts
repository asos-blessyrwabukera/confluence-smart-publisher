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
 * Specifically handles underscores within \text{} commands.
 * @param latex The original LaTeX string
 * @returns Sanitized LaTeX string compatible with KaTeX
 */
function sanitizeLatexForKaTeX(latex: string): string {
  // Handle underscores within \text{} commands
  // This regex finds \text{...} blocks and escapes underscores within them
  return latex.replace(/\\text\{([^}]*)\}/g, (match, content) => {
    // Escape underscores within the \text{} content
    const escapedContent = content.replace(/_/g, '\\_');
    return `\\text{${escapedContent}}`;
  });
}

/**
 * Processes LaTeX code based on the configured math renderer.
 * @param latex The original LaTeX string
 * @returns Processed LaTeX string based on renderer choice
 */
function processLatexForRenderer(latex: string): string {
  const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
  const mathRenderer = config.get('mathRenderer', 'katex') as string;

  switch (mathRenderer) {
    case 'katex':
      // Apply KaTeX-specific sanitization
      return sanitizeLatexForKaTeX(latex);
    
    case 'mathjax':
      // MathJax is more tolerant but might benefit from some light processing
      // Keep original syntax for better compatibility
      return latex;
    
    case 'latex':
    default:
      // Pure LaTeX - no modifications
      return latex;
  }
}

export default function convertMathBlock(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  let latex = '';
  if (typeof node.text === 'string') {
    latex = node.text;
  } else if (Array.isArray(node.content)) {
    latex = node.content.map(child => child.text || '').join('');
  }
  
  // Process LaTeX based on configured renderer
  latex = processLatexForRenderer(latex);
  
  let yamlBlock = '';
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    yamlBlock = generateYamlBlock({ adfType: node.type, ...node.attrs });
  }
  const markdown = `$$\n${latex}\n$$`;
  return { markdown };
} 