/**
 * Converts $1 to markdown.
 * The markdown is a blockquote with an icon/text and the children content as paragraphs.
 * Always generates a yamlBlock with adfType and attrs.
 * @param node The panel ADF node
 * @param children The already converted children blocks
 * @returns ConverterResult
 */
import { AdfNode, MarkdownBlock, ConverterResult, iconMaps } from '../types';

export default function convertPanel(node: AdfNode, children: MarkdownBlock[]): ConverterResult {
  const panelType = node.attrs && typeof node.attrs['panelType'] === 'string' ? node.attrs['panelType'] : '';
  const icon = iconMaps[panelType] || '';
  const iconText = node.attrs && node.attrs['panelIconText'] ? String(node.attrs['panelIconText']) : '';
  const content = children.map(child => child.markdown).join('');
  // Split content into paragraphs
  const paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  let md = '';
  if (paragraphs.length > 0) {
    // First paragraph gets icon/text
    if (icon && iconText) {
      md = `> ${icon} ${iconText}: ${paragraphs[0]}`;
    } else if (icon) {
      md = `> ${icon}: ${paragraphs[0]}`;
    } else if (iconText) {
      md = `> ${iconText}: ${paragraphs[0]}`;
    } else {
      md = `> ${paragraphs[0]}`;
    }
    // Other paragraphs just prefixed with '>'
    for (let i = 1; i < paragraphs.length; i++) {
      md += `\n> ${paragraphs[i]}`;
    }
  } else {
    md = '> ';
  }
  return { markdown: md };
} 