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

  // Rastreia a pilha de tags para saber quais tags estão atualmente abertas
  const tagStack: { tagName: string, isInline: boolean }[] = [];

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

  type LastTagType = 'none' | 'open-block' | 'open-inline' | 'close-inline' | 'close-block' | 'text';
  let lastTagType: LastTagType = 'none';
  for (let i = 0; i < tokens.length; i++) {
    const tokenObj = tokens[i];
    if (tokenObj.type === 'tag') {
      const { value: token, isClosing, isSelfClosing, tagName } = tokenObj;
      if (!tagName) {continue;}
      
      const tagType = TAG_BEHAVIOR[tagName] ? TAG_BEHAVIOR[tagName].type : 'block';
      const isInline = tagType === 'inline';
      const isBlock = tagType === 'block';
      
      // Verifica se estamos dentro de uma tag inline
      const insideInlineTag = tagStack.length > 0 && tagStack[tagStack.length - 1].isInline;
      
      // TAG DE ABERTURA INLINE
      if (!isClosing && !isSelfClosing && isInline) {
        // Tratamento especial para tags h1-h6
        if (/^h[1-6]$/.test(tagName)) {
          result += '\n' + '  '.repeat(indent) + token.trim();
          if (!isSelfClosing) {
            tagStack.push({ tagName, isInline: true });
          }
          lastTagType = 'open-inline';
          continue;
        }

        if (lastTagType === 'open-block' || lastTagType === 'close-inline' || lastTagType === 'close-block' || lastTagType === 'text' || lastTagType === 'none') {
          result += '\n' + '  '.repeat(indent) + token.trim();
        } else {
          result += token.trim();
        }
        if (!isSelfClosing) {
          indent++;
          tagStack.push({ tagName, isInline: true });
        }
        lastTagType = 'open-inline';
        continue;
      }
      
      // TAG DE ABERTURA BLOCK
      if (!isClosing && !isSelfClosing && isBlock) {
        if (lastTagType === 'open-inline') {
          result += token.trim();
        } else {
          result += '\n' + '  '.repeat(indent) + token.trim();
        }
        
        if (!isSelfClosing) {
          indent++;
          tagStack.push({ tagName, isInline: false });
        }
        lastTagType = 'open-block';
        continue;
      }
      
      // TAG DE FECHAMENTO
      if (isClosing) {
        indent = Math.max(indent - 1, 0);
        if (tagStack.length > 0) {tagStack.pop();}
        
        const stillInsideInlineTag = tagStack.length > 0 && tagStack[tagStack.length - 1].isInline;
        
        // Tratamento especial para tags h1-h6
        if (/^h[1-6]$/.test(tagName)) {
          result += token.trim() + '\n';
          lastTagType = 'close-block';
          continue;
        }

        if (isInline) {
          result += token.trim();
          lastTagType = 'close-inline';
        } else {
          result += '\n' + '  '.repeat(indent) + token.trim();
          lastTagType = 'close-block';
        }
        continue;
      }
      
      // TAG SELF-CLOSING
      if (isInline && insideInlineTag) {
        result += token.trim();
      } else {
        result += '\n' + '  '.repeat(indent) + token.trim();
      }
      lastTagType = isInline ? 'close-inline' : 'close-block';
    } else {
      // Texto
      const textContent = tokenObj.value.replace(/\s+/g, ' ').trim();
      if (textContent) {
        if (lastTagType === 'open-inline') {
          result += textContent;
        } else {
          const insideInlineTag = tagStack.length > 0 && tagStack[tagStack.length - 1].isInline;
          if (insideInlineTag) {
            result += textContent;
          } else {
            result += '\n' + '  '.repeat(indent) + textContent;
          }
        }
        lastTagType = 'text';
      }
    }
  }
  let processed = result
    .replace(/^[ \t]*\n/, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n([ \t]*\n)+/g, '\n')
    .trim() + '\n';
  return processed;
}

// Pós-processamento modificado para respeitar as tags block dentro de tags inline
function keepInlineTagsOnSameLine(text: string): string {
  const inlineTags = Object.entries(TAG_BEHAVIOR)
    .filter(([_, v]) => v.type === 'inline')
    .map(([tag]) => tag.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1'));
  
  const blockTags = Object.entries(TAG_BEHAVIOR)
    .filter(([_, v]) => v.type === 'block')
    .map(([tag]) => tag.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1'));
  
  if (inlineTags.length === 0) {return text;}
  
  // Regex para pegar <tag ...>...conteudo...</tag> (permitindo espaços/quebras de linha entre as partes)
  const regex = new RegExp(
    `<(${inlineTags.join('|')})([^>]*)>\\s*(([\\s\\S]*?))\\s*<\\/\\1>`,
    'g'
  );
  
  // Function to check if content contains a block tag
  const containsBlockTag = (content: string): boolean => {
    if (blockTags.length === 0) {return false;}
    const blockTagRegex = new RegExp(`<(${blockTags.join('|')})([^>]*)>`, 'i');
    return blockTagRegex.test(content);
  };
  
  let prev;
  let curr = text;
  let iterations = 0;
  const maxIterations = 5; // Limita o número de iterações para evitar loops infinitos
  
  do {
    prev = curr;
    curr = curr.replace(regex, (match, tag, attrs, content) => {
      // Se contém uma tag block, mantém a formatação original
      if (containsBlockTag(content)) {
        return match;
      }
      
      // Otherwise, clean the content, preserving any tags inside it
      const cleanedContent = content
        .replace(/\n\s+</g, '<')         // Remove breaks before opening tags
        .replace(/>\s+\n/g, '>')         // Remove breaks after closing tags
        .replace(/>\s+\n\s+</g, '><')    // Remove breaks between tags
        .replace(/\s+/g, ' ');           // Normalize spaces
      
      return `<${tag}${attrs}>${cleanedContent}</${tag}>`;
    });
    
    iterations++;
  } while (curr !== prev && iterations < maxIterations);
  
  return curr;
}

export function formatConfluenceDocument(text: string, numberChapters: boolean = false, outputChannel?: vscode.OutputChannel): string {
  try {
    let processedText = text.trim();
    if (numberChapters) {
      processedText = numberHeadings(processedText);
    }
    let formatted = formatHtmlLike(processedText);

    // Pós-formatação para tags inline (remove espaços/quebras entre abertura, texto e fechamento)
    formatted = keepInlineTagsOnSameLine(formatted);
    
    // Remove linhas em branco duplicadas
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    return formatted;
  } catch (e) {
    if (outputChannel) {
      outputChannel.appendLine(`Error formatting file: ${e instanceof Error ? e.message : String(e)}`);
    }else{
      vscode.window.showErrorMessage(`Error formatting file: ${e instanceof Error ? e.message : String(e)}`);
    }
    throw e;
  }
}

function numberHeadings(text: string): string {
  // Numera h1-h6 sequencialmente, reiniciando a contagem para subníveis
  const headingRegex = /([ \t]*)<(h[1-6])>([\s\S]*?)<\/\2>/gi;
  const counters = [0, 0, 0, 0, 0, 0];
  return text.replace(headingRegex, (spaces, tag, content) => {
    const level = parseInt(tag[1]);
    // Zera contadores de subníveis
    for (let i = level; i < counters.length; i++) {counters[i] = 0;}
    counters[level - 1]++;
    // Prefixo esperado
    const expectedPrefix = counters.slice(0, level).filter(n => n > 0).join('.') + ' ';
    // Remove all numeric prefixes from the beginning of content, as many times as they appear
    const cleanContent = cleanHeadingContent(content);
    return `${spaces}<${tag}>${expectedPrefix}${cleanContent}</${tag}>`;
  });
}

function cleanHeadingContent(content: string): string {
  // Remove all numeric prefixes from the beginning of content, as many times as they appear
  let cleaned = content;
  while (/^\d+(\.\d+)*\s+/.test(cleaned)) {
    cleaned = cleaned.replace(/^\d+(\.\d+)*\s+/, '');
  }
  return cleaned;
}

// Decodifica entidades HTML apenas nos textos entre as tags, preservando tags e atributos
export function decodeHtmlEntities(text: string): string {
  return text.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, txt) => {
    if (tag) {return tag;}
    if (txt) {return decodeEntities(txt, { level: EntityLevel.HTML });}
    return match;
  });
} 