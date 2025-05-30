// Função utilitária para formatar documentos da linguagem Confluence
// Mantém apenas a numeração de headings e a formatação padrão HTML-like

import * as vscode from 'vscode';
import { decode as decodeEntities, EntityLevel } from 'entities';
import { TAG_BEHAVIOR } from './confluenceSchema';

// Formatter baseado em HTML: identação simples de tags
function formatHtmlLike(text: string): string {
  const tagRegex = /<\/?[\w:-]+[^>]*>|[^<]+/g;
  let indent = 0;
  let result = '';
  let match;

  // Lista de tokens para preservar tudo, mesmo malformado
  const tokens: { type: 'tag' | 'text', value: string, tagName?: string, isClosing?: boolean, isSelfClosing?: boolean }[] = [];
  while ((match = tagRegex.exec(text)) !== null) {
    const token = match[0];
    if (token.startsWith('<')) {
      const isClosing = /^<\//.test(token);
      const isSelfClosing = /\/>$/.test(token) || /^<\w+[^>]*\/>$/.test(token);
      const tagName = token.match(/^<\/?(\w+[:\w-]*)/)?.[1];
      tokens.push({ type: 'tag', value: token, tagName, isClosing, isSelfClosing });
    } else {
      tokens.push({ type: 'text', value: token });
    }
  }

  let lastTokenWasClosingTag = false;
  for (let i = 0; i < tokens.length; i++) {
    const tokenObj = tokens[i];
    if (tokenObj.type === 'tag') {
      const { value: token, isClosing, isSelfClosing } = tokenObj;
      if (!isClosing && !isSelfClosing && lastTokenWasClosingTag) {
        result += '\n' + '  '.repeat(indent);
      }
      if (isClosing) {
        indent = Math.max(indent - 1, 0);
        result += '\n' + '  '.repeat(indent) + token.trim();
        lastTokenWasClosingTag = true;
        continue;
      } else {
        result += '\n' + '  '.repeat(indent) + token.trim();
        if (!isSelfClosing) {
          indent++;
        }
        lastTokenWasClosingTag = false;
      }
    } else {
      // Texto
      const textContent = tokenObj.value.replace(/\s+/g, ' ').trim();
      if (textContent) {
        result += '\n' + '  '.repeat(indent) + textContent;
      }
      lastTokenWasClosingTag = false;
    }
  }
  // Remove quebras de linha duplicadas e espaços extras
  let processed = result
    .replace(/^[ \t]*\n/, '') // remove quebra de linha inicial
    .replace(/\n{3,}/g, '\n\n') // no máximo duas quebras consecutivas
    .replace(/[ \t]+\n/g, '\n') // remove espaços antes de quebras de linha
    .replace(/\n([ \t]*\n)+/g, '\n') // remove linhas em branco extras
    .trim() + '\n';
  return processed;
}

// Pós-processamento: mantém tags inline na mesma linha
function keepInlineTagsOnSameLine(text: string): string {
  // Gera regex para todas as tags inline
  const inlineTags = Object.entries(TAG_BEHAVIOR)
    .filter(([_, v]) => v.inline)
    .map(([tag]) => tag.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1'));
  if (inlineTags.length === 0) {return text;}
  // Regex para pegar <tag ...>...</tag> (não recursivo, só para inline simples)
  const regex = new RegExp(
    `<(${inlineTags.join('|')})([^>]*)>([\s\S]*?)<\/\\1>`,
    'g'
  );
  // Substitui para manter tudo na mesma linha
  return text.replace(regex, (match, tag, attrs, content) => {
    // Remove quebras de linha internas e espaços excessivos
    const cleanContent = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return `<${tag}${attrs}>${cleanContent}</${tag}>`;
  });
}

export function formatConfluenceDocument(text: string, numberChapters: boolean = false): string {
  try {
    let processedText = text.trim();
    if (numberChapters) {
      processedText = numberHeadings(processedText);
    }
    let formatted = formatHtmlLike(processedText);
    // Pós-formatação para tags inline
    outputChannel
    console.log('ANTES:', formatted);
    formatted = keepInlineTagsOnSameLine(formatted);
    console.log('DEPOIS:', formatted);
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

// Decodifica entidades HTML apenas nos textos entre as tags, preservando tags e atributos
export function decodeHtmlEntities(text: string): string {
  return text.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, txt) => {
    if (tag) {return tag;}
    if (txt) {return decodeEntities(txt, { level: EntityLevel.HTML });}
    return match;
  });
} 