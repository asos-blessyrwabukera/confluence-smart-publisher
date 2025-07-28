import * as vscode from 'vscode';

/**
 * Valida a estrutura, atributos obrigatórios e tipos de um documento Confluence customizado em formato JSON.
 * Retorna diagnósticos para uso na aba Problems do VSCode.
 */
export function getConfluenceDiagnostics(text: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e: any) {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Invalid JSON: ' + e.message,
      vscode.DiagnosticSeverity.Error
    ));
    return diagnostics;
  }

  // Validação do bloco csp
  if (!json.csp) {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Missing required "csp" block at root of document.',
      vscode.DiagnosticSeverity.Error
    ));
    return diagnostics;
  }
  const csp = json.csp;
  // Chaves obrigatórias
  const requiredKeys = ['file_id', 'labels_list', 'parent_id', 'properties'];
  for (const key of requiredKeys) {
    if (!(key in csp)) {
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        `Missing required key "${key}" in csp block`,
        vscode.DiagnosticSeverity.Error
      ));
    }
  }
  // Tipos esperados
  if (typeof csp.file_id !== 'string') {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'csp.file_id must be a string',
      vscode.DiagnosticSeverity.Error
    ));
  }
  if (typeof csp.labels_list !== 'string') {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'csp.labels_list must be a string',
      vscode.DiagnosticSeverity.Error
    ));
  }
  if (typeof csp.parent_id !== 'string') {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'csp.parent_id must be a string',
      vscode.DiagnosticSeverity.Error
    ));
  }
  if (!Array.isArray(csp.properties)) {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'csp.properties must be an array',
      vscode.DiagnosticSeverity.Error
    ));
  } else {
    csp.properties.forEach((prop: any, idx: number) => {
      if (typeof prop !== 'object' || prop === null) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `csp.properties[${idx}] must be an object`,
          vscode.DiagnosticSeverity.Error
        ));
      } else {
        if (!('key' in prop)) {
          diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 1),
            `Missing key "key" in csp.properties[${idx}]`,
            vscode.DiagnosticSeverity.Error
          ));
        }
        if (!('value' in prop)) {
          diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 1),
            `Missing key "value" in csp.properties[${idx}]`,
            vscode.DiagnosticSeverity.Error
          ));
        }
      }
    });
  }
  return diagnostics;
} 