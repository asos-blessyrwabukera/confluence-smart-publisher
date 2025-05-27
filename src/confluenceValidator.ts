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
          `Tag de fechamento </${tag}> sem abertura correspondente`,
          vscode.DiagnosticSeverity.Warning
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
      `Tag de abertura <${open.tag}> sem fechamento correspondente`,
      vscode.DiagnosticSeverity.Warning
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