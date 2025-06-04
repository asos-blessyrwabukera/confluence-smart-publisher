import * as vscode from 'vscode';

/**
 * Retorna diagnósticos de tags não fechadas ou não abertas para uso na aba Problems do VSCode.
 */
export function getUnclosedOrUnopenedTagDiagnostics(text: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const openTags: { tag: string, index: number }[] = [];
  const tagRegex = /<\/?([\w:-]+)[^>]*?>/g;
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const [full, tag] = match;
    const isClosing = full.startsWith('</');
    const isSelfClosing = /\/>$/.test(full);
    if (!isClosing && !isSelfClosing) {
      // Tag de abertura (não self-closing)
      openTags.push({ tag, index: match.index });
    } else if (isClosing) {
      const lastOpenIdx = openTags.map(t => t.tag).lastIndexOf(tag);
      if (lastOpenIdx === -1) {
        // Tag de fechamento sem abertura
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(
            textToPosition(text, match.index),
            textToPosition(text, match.index + full.length)
          ),
          'Tag ' + tag + ' is closing without being opened.',
          vscode.DiagnosticSeverity.Error
        ));
      } else {
        openTags.splice(lastOpenIdx, 1);
      }
    }
    // Tags self-closing são ignoradas
  }
  // O que sobrou na pilha são tags não fechadas
  for (const open of openTags) {
    const tagMatch = text.slice(open.index).match(/<\/?[\w:-]+[^>]*?>/);
    const length = tagMatch ? tagMatch[0].length : open.tag.length;
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(
        textToPosition(text, open.index),
        textToPosition(text, open.index + length)
      ),
      'Tag ' + open.tag + ' is opened but never closed.',
      vscode.DiagnosticSeverity.Error
    ));
  }
  return diagnostics;
}

// Função auxiliar para converter índice de string para Position do VSCode
function textToPosition(text: string, index: number): vscode.Position {
  const lines = text.slice(0, index).split(/\r?\n/);
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;
  return new vscode.Position(line, character);
}

/**
 * Valida a estrutura, atributos obrigatórios e hierarquia de um documento Confluence customizado.
 * Retorna diagnósticos para uso na aba Problems do VSCode.
 */
export function getConfluenceDiagnostics(text: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  // Pilha para rastrear tags abertas
  const openTags: { tag: string, index: number, line: number, char: number }[] = [];
  // Regex para encontrar tags
  const tagRegex = /<\/?([\w:-]+)[^>]*?>/g;
  let match;
  // Para mapear índice para linha/coluna
  const lines = text.split(/\r?\n/);
  // Função para achar linha/coluna a partir do índice
  function getLineCol(index: number) {
    let total = 0;
    for (let i = 0; i < lines.length; i++) {
      if (index < total + lines[i].length + 1) {
        return { line: i, char: index - total };
      }
      total += lines[i].length + 1;
    }
    return { line: lines.length - 1, char: lines[lines.length - 1].length };
  }
  while ((match = tagRegex.exec(text)) !== null) {
    const [full, tag] = match;
    const isClosing = full.startsWith('</');
    const isSelfClosing = /\/$/.test(full);
    const pos = getLineCol(match.index);
    if (!isClosing && !isSelfClosing) {
      // Tag de abertura (não self-closing)
      openTags.push({ tag, index: match.index, line: pos.line, char: pos.char });
    } else if (isClosing) {
      // Tag de fechamento
      const lastOpenIdx = openTags.map(t => t.tag).lastIndexOf(tag);
      if (lastOpenIdx === -1) {
        // Não foi aberta antes
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(pos.line, pos.char, pos.line, pos.char + full.length),
          'Closing tag </' + tag + '> without corresponding opening tag',
          vscode.DiagnosticSeverity.Error
        ));
      } else {
        // Remove da pilha até encontrar a correspondente
        openTags.splice(lastOpenIdx, 1);
      }
    }
  }
  // O que sobrou na pilha são tags não fechadas
  for (const open of openTags) {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(open.line, open.char, open.line, open.char + open.tag.length + 2),
      'Opening tag <' + open.tag + '> without corresponding closing tag',
      vscode.DiagnosticSeverity.Error
    ));
  }

  // --- Validações de estrutura, atributos obrigatórios e hierarquia ---
  let $: any;
  try {
    $ = require('cheerio').load(text, { xmlMode: false });
  } catch (e: any) {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Error parsing HTML: ' + e.message,
      vscode.DiagnosticSeverity.Error
    ));
    return diagnostics;
  }

  // Importações dinâmicas para evitar dependência circular
  const { allowedTags, allowedHierarchy } = require('./confluenceSchema');

  function checkTagsCheerio(selector: string, parentSelector?: string) {
    $(selector).each((_: number, el: any) => {
      const tag = el.tagName;
      // Posição da tag no texto
      const html = $.html(el);
      const idx = text.indexOf('<' + tag);
      const pos = getLineCol(idx >= 0 ? idx : 0);
      if (!(tag in allowedTags)) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(pos.line, pos.char, pos.line, pos.char + tag.length + 2),
          'Not allowed tag: <' + tag + '>',
          vscode.DiagnosticSeverity.Error
        ));
      } else {
        const requiredAttrs = allowedTags[tag];
        for (const attr of requiredAttrs) {
          if (!$(el).attr(attr)) {
            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(pos.line, pos.char, pos.line, pos.char + tag.length + 2),
              'Required attribute \'' + attr + '\' missing in <' + tag + '>',
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
        // Hierarquia
        if (tag in allowedHierarchy && parentSelector) {
          const parent = $(el).parent()[0];
          if (parent && !allowedHierarchy[tag].includes(parent.tagName)) {
            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(pos.line, pos.char, pos.line, pos.char + tag.length + 2),
              '<' + tag + '> must be inside ' + allowedHierarchy[tag].map((p: string) => '<' + p + '>').join(' or '),
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      }
    });
  }

  // Checa todas as tags customizadas
  Object.keys(allowedTags).forEach((tag: string) => {
    if (tag.includes(':')) {
      checkTagsCheerio(tag);
    }
  });

  // Validação de estrutura obrigatória CSP
  const csp = $('csp:parameters');
  if (csp.length === 0) {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Required tag <csp:parameters> in document.',
      vscode.DiagnosticSeverity.Error
    ));
  } else {
    const cspEl = csp[0];
    if (!$(cspEl).attr('xmlns:csp')) {
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        'Required attribute xmlns:csp in <csp:parameters>. Example: <csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">',
        vscode.DiagnosticSeverity.Error
      ));
    }
    if ($(cspEl).find('csp:file_id').length === 0) {
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        'Required tag <csp:file_id> inside <csp:parameters>.',
        vscode.DiagnosticSeverity.Error
      ));
    }
    if ($(cspEl).find('csp:labels_list').length === 0) {
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        'Required tag <csp:labels_list> inside <csp:parameters>.',
        vscode.DiagnosticSeverity.Error
      ));
    }
    if ($(cspEl).find('csp:parent_id').length === 0) {
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        'Required tag <csp:parent_id> inside <csp:parameters>.',
        vscode.DiagnosticSeverity.Error
      ));
    }
    if ($(cspEl).find('csp:properties').length === 0) {
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        'Required tag <csp:properties> inside <csp:parameters>.',
        vscode.DiagnosticSeverity.Error
      ));
    } else {
      const props = $(cspEl).find('csp:properties');
      props.each((_: number, propEl: any) => {
        const keys = $(propEl).find('csp:key');
        const values = $(propEl).find('csp:value');
        if (keys.length !== values.length) {
          diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 1),
            'The number of <csp:key> and <csp:value> in <csp:properties> must be equal.',
            vscode.DiagnosticSeverity.Error
          ));
        }
      });
    }
  }

  // Validação específica para ac:layout como root
  const acLayout = $('ac:layout');
  if (acLayout.length > 0) {
    acLayout.each((_: number, layoutEl: any) => {
      if (!$(layoutEl).attr('version')) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          '<ac:layout> must contain the required attribute \'version\'.',
          vscode.DiagnosticSeverity.Error
        ));
      }
      if (!$(layoutEl).attr('type')) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          '<ac:layout> must contain the required attribute \'type\'.',
          vscode.DiagnosticSeverity.Error
        ));
      }
      const sections = $(layoutEl).find('ac:layout-section');
      if (sections.length === 0) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          '<ac:layout> must contain at least one <ac:layout-section> as a child.',
          vscode.DiagnosticSeverity.Error
        ));
      } else {
        sections.each((idx: number, sectionEl: any) => {
          if (!$(sectionEl).attr('type')) {
            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(0, 0, 0, 1),
              '<ac:layout-section> (position ' + (idx + 1) + ') must contain the required attribute \'type\'.',
              vscode.DiagnosticSeverity.Error
            ));
          }
          const cells = $(sectionEl).find('ac:layout-cell');
          if (cells.length === 0) {
            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(0, 0, 0, 1),
              '<ac:layout-section> (position ' + (idx + 1) + ') must contain at least one <ac:layout-cell> as a child.',
              vscode.DiagnosticSeverity.Error
            ));
          } else {
            cells.each((cidx: number, cellEl: any) => {
              if (!$(cellEl).attr('id')) {
                diagnostics.push(new vscode.Diagnostic(
                  new vscode.Range(0, 0, 0, 1),
                  '<ac:layout-cell> (position ' + (cidx + 1) + ' of section ' + (idx + 1) + ') must contain the required attribute \'id\'.',
                  vscode.DiagnosticSeverity.Error
                ));
              }
              if (!$(cellEl).attr('style')) {
                diagnostics.push(new vscode.Diagnostic(
                  new vscode.Range(0, 0, 0, 1),
                  '<ac:layout-cell> (position ' + (cidx + 1) + ' of section ' + (idx + 1) + ') must contain the required attribute \'style\'.',
                  vscode.DiagnosticSeverity.Error
                ));
              }
            });
          }
        });
      }
    });
  }

  return diagnostics;
} 