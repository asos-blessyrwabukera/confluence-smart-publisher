// Função utilitária para formatar documentos da linguagem Confluence
// Pode ser expandida para incluir mais regras de formatação no futuro

// Formatter unificado para Confluence Storage Format
// Inclui tratamento especial para múltiplos roots e identação de tags estruturais

import { allowedHierarchy, TAG_BEHAVIOR } from './confluenceSchema';
import * as vscode from 'vscode';

// Funções auxiliares padronizadas
function isBlockTag(tag: string) {
  return !!TAG_BEHAVIOR[tag]?.block;
}
function isInlineTag(tag: string) {
  return !!TAG_BEHAVIOR[tag]?.inline;
}
function isInlineTextTag(tag: string) {
  return !!TAG_BEHAVIOR[tag]?.inlineText;
}

// Calcula as tags root a partir da hierarquia
const allTags = Object.keys(allowedHierarchy);
const childTags = new Set(Object.values(allowedHierarchy).flat());
const ROOT_TAGS = allTags.filter(tag => !childTags.has(tag));

function isRootTag(tag: string) {
  // Uma tag é root se não aparece como filha de nenhuma outra na allowedHierarchy
  return !Object.values(allowedHierarchy).flat().includes(tag);
}

function formatConfluenceStorage(xml: string): string {
  // Divide múltiplos roots para garantir quebra de linha entre eles, considerando apenas tags root
  const roots = [];
  let buffer = '';
  let depth = 0;
  const tagRegex = /<([\w:-]+)([^>]*)>|<\/([\w:-]+)>/g;
  let lastIndex = 0;
  let match;
  while ((match = tagRegex.exec(xml)) !== null) {
    if (match[1]) { // tag de abertura
      if (depth === 0 && buffer.trim()) {
        // Só considera como root se a tag for root (usando nova definição)
        const tagName = buffer.match(/^<([\w:-]+)/)?.[1];
        if (tagName && isRootTag(tagName)) {
          roots.push(buffer);
          buffer = '';
        }
      }
      depth++;
    } else if (match[3]) { // tag de fechamento
      depth--;
    }
    buffer += xml.slice(lastIndex, tagRegex.lastIndex);
    lastIndex = tagRegex.lastIndex;
    if (depth === 0 && buffer.trim()) {
      const tagName = buffer.match(/^<([\w:-]+)/)?.[1];
      if (tagName && isRootTag(tagName)) {
        roots.push(buffer);
        buffer = '';
      }
    }
  }
  if (buffer.trim()) {
    const tagName = buffer.match(/^<([\w:-]+)/)?.[1];
    if (tagName && isRootTag(tagName)) {
      roots.push(buffer);
    }
  }

  // Formata cada root separadamente
  return roots.map(root => formatConfluenceStorageSingle(root.trim())).join('\n\n');
}

function formatConfluenceStorageSingle(xml: string): string {
  const tagRegex = /<\/?([\w:-]+)([^>]*)>|([^<]+)/g;
  let match;
  let indent = 0;
  let result = '';
  let lastWasBlockClose = false;
  let lastTagWasClose = false;
  let lastIndent = 0;

  while ((match = tagRegex.exec(xml)) !== null) {
    if (match[1]) { // É uma tag
      const tag = match[1];
      const isClosing = match[0][1] === '/';
      const isBlock = isBlockTag(tag);
      if (isBlockTag(tag) && !isClosing) {
        result += '\n' + '  '.repeat(indent);
      }
      if (isBlock) {
        if (isClosing) { indent--; }
        // Se a última tag foi fechamento e agora é abertura, ou se mudou a hierarquia, força quebra de linha
        if ((lastTagWasClose && !isClosing) || (!isClosing && indent <= lastIndent)) {
          result += '\n';
        }
        if (!lastWasBlockClose || isClosing) { result += '\n'; }
        result += '  '.repeat(indent) + match[0].trim();
        if (!isClosing) { lastIndent = indent; indent++; }
        lastWasBlockClose = true;
        lastTagWasClose = isClosing;
      } else {
        result += match[0];
        lastWasBlockClose = false;
        lastTagWasClose = isClosing;
      }
    } else if (match[3]) { // É texto
      const text = match[3].replace(/\s+/g, ' ');
      if (text.trim()) {
        result += text;
        lastWasBlockClose = false;
        lastTagWasClose = false;
      }
    }
  }
  // Remove quebras de linha duplicadas
  return result.replace(/\n{3,}/g, '\n\n').replace(/^\s*\n/gm, '').trim();
}

// Formatter baseado em HTML: identação simples de tags
function formatHtmlLike(text: string): string {
  // 1. Formatação padrão HTML-like
  const tagRegex = /<\/?[\w:-]+[^>]*>|[^<]+/g;
  let indent = 0;
  let result = '';
  let lastWasText = false;
  let match;
  let lastTag: string | null = null;
  let lastTagIsInlineText = false;
  let bufferInlineText = '';

  // Novo: lista de tokens para preservar tudo, mesmo malformado
  const tokens: { type: 'tag' | 'text', value: string, tagName?: string, isClosing?: boolean, isSelfClosing?: boolean }[] = [];
  while ((match = tagRegex.exec(text)) !== null) {
    const token = match[0];
    if (token.startsWith('<')) {
      // Tag de abertura, fechamento ou self-closing
      const isClosing = /^<\//.test(token);
      const isSelfClosing = /\/>$/.test(token) || /^<\w+[^>]*\/>$/.test(token);
      const tagName = token.match(/^<\/?(\w+[:\w-]*)/)?.[1];
      tokens.push({ type: 'tag', value: token, tagName, isClosing, isSelfClosing });
    } else {
      tokens.push({ type: 'text', value: token });
    }
  }

  // Percorre tokens preservando tudo
  for (let i = 0; i < tokens.length; i++) {
    const tokenObj = tokens[i];
    if (tokenObj.type === 'tag') {
      const { value: token, tagName, isClosing, isSelfClosing } = tokenObj;
      if (isClosing && tagName && lastTagIsInlineText && tagName === lastTag) {
        // Fecha a tag inline-text na mesma linha
        bufferInlineText += token.trim();
        result += '\n' + '  '.repeat(indent - 1) + bufferInlineText;
        bufferInlineText = '';
        lastTagIsInlineText = false;
        lastTag = null;
        indent = Math.max(indent - 1, 0);
        lastWasText = false;
        continue;
      }
      if (isClosing) {
        indent = Math.max(indent - 1, 0);
        result += '\n' + '  '.repeat(indent) + token.trim();
        lastWasText = false;
        lastTag = null;
        lastTagIsInlineText = false;
      } else if (tagName && isInlineTextTag(tagName) && !isSelfClosing) {
        // Começa buffer para tag inline-text
        bufferInlineText = token.trim();
        lastTag = tagName;
        lastTagIsInlineText = true;
        indent++;
        continue;
      } else {
        result += '\n' + '  '.repeat(indent) + token.trim();
        if (!isSelfClosing) {
          indent++;
        }
        lastWasText = false;
        lastTag = tagName || null;
        lastTagIsInlineText = false;
      }
    } else {
      // Texto
      const textContent = tokenObj.value.replace(/\s+/g, ' ').trim();
      if (textContent) {
        if (lastTagIsInlineText) {
          bufferInlineText += textContent;
        } else {
          result += '\n' + '  '.repeat(indent) + textContent;
        }
        lastWasText = true;
      }
    }
  }
  // Remove quebras de linha duplicadas e espaços extras
  let processed = result.replace(/^\s*\n/, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  // 2. Pós-processamento: normaliza blocos CSP e outras tags inlineText
  // Garante que todas as tags inlineText fiquem em linha única
  processed = processed.replace(/<([\w:-]+)>[\s\n\r]*([\s\S]*?)[\s\n\r]*<\/1>/g, (match: string, tag: string, value: string) => {
    if (isInlineTextTag(tag)) {
      return `<${tag}>${value.replace(/\s+/g, ' ').trim()}</${tag}>`;
    }
    return match;
  });

  // 2.2. Formata blocos de propriedades para garantir que cada filho fique em uma linha separada
  processed = processed.replace(/<([\w:-]+)>([\s\S]*?)<\/1>/g, (match: string, tag: string, inner: string) => {
    if (isBlockTag(tag)) {
      // Divide todas as tags filhas
      const tagRegex = /<([\w:]+)>[\s\S]*?<\/1>/g;
      const items = [];
      let m: RegExpExecArray | null;
      let lastIndex = 0;
      while ((m = tagRegex.exec(inner)) !== null) {
        const childTag = m[1];
        let tagBlock = m[0].replace(/\s+$/g, '').trim();
        if (isInlineTextTag(childTag)) {
          tagBlock = tagBlock.replace(/\s+/g, ' ');
        } else if (isBlockTag(childTag)) {
          tagBlock = '    ' + tagBlock;
        }
        items.push(tagBlock);
        lastIndex = tagRegex.lastIndex;
      }
      let extra = inner.slice(lastIndex).trim();
      if (extra) {items.push('    ' + extra);}
      return `\n  <${tag}>\n${items.join('\n')}\n  </${tag}>`;
    }
    return match;
  });

  // 2.3. Formata blocos de parâmetros para garantir que cada tag filha fique em uma linha separada
  processed = processed.replace(/<([\w:-]+)([^>]*)>([\s\S]*?)<\/1>/g, (match: string, tag: string, attrs: string, inner: string) => {
    if (isBlockTag(tag)) {
      // Divide todas as tags filhas
      const tagRegex = /<([\w:]+)[^>]*>[\s\S]*?<\/1>/g;
      const items = [];
      let m: RegExpExecArray | null;
      let lastIndex = 0;
      while ((m = tagRegex.exec(inner)) !== null) {
        const childTag = m[1];
        let tagBlock = m[0].replace(/\s+$/g, '').trim();
        if (isBlockTag(childTag)) {
          tagBlock = tagBlock.split('\n').map(l => '  ' + l).join('\n');
        } else if (isInlineTextTag(childTag)) {
          tagBlock = tagBlock.replace(/\s+/g, ' ');
        } else {
          tagBlock = '  ' + tagBlock;
        }
        items.push(tagBlock);
        lastIndex = tagRegex.lastIndex;
      }
      let extra = inner.slice(lastIndex).trim();
      if (extra) {items.push('  ' + extra);}
      return `<${tag}${attrs}>\n${items.join('\n')}\n</${tag}>`;
    }
    return match;
  });

  return processed;
}

export function formatConfluenceDocument(text: string, numberChapters: boolean = false): string {
  try {
    let processedText = text.trim();
    if (numberChapters) {
      processedText = numberHeadings(processedText);
    }
    let formatted = formatHtmlLike(processedText);
    // Não aplica mais destaque em tags não fechadas ou não abertas
    return formatted;
  } catch (e) {
    vscode.window.showErrorMessage('Erro ao formatar o documento: ' + (e instanceof Error ? e.message : String(e)));
    return text;
  }
}

function numberHeadings(text: string): string {
  // Numera h1-h6 sequencialmente, reiniciando a contagem para subníveis
  const headingRegex = /([ \t]*)<(h[1-6])>([\s\S]*?)<\/\2>/gi;
  const counters = [0, 0, 0, 0, 0, 0];
  return text.replace(headingRegex, (match, spaces, tag, content) => {
    const level = parseInt(tag[1]);
    // Zera contadores de subníveis
    for (let i = level; i < counters.length; i++) {counters[i] = 0;}
    counters[level - 1]++;
    // Prefixo esperado
    const expectedPrefix = counters.slice(0, level).filter(n => n > 0).join('.') + ' ';
    // Remove todos os prefixos numéricos do início do conteúdo, quantas vezes aparecerem
    const cleanContent = cleanHeadingContent(content);
    return `${spaces}<${tag}>${expectedPrefix}${cleanContent}</${tag}>`;
  });
}

function cleanHeadingContent(content: string): string {
  // Remove tudo que for número, ponto, traço, parêntese, colchete, chave e espaços do início
  return content.replace(/^[\s\n\r0-9.\-–—()\[\]{}]+/, '').replace(/^([ \t\n\r]*)/, '');
} 