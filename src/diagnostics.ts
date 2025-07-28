import * as vscode from 'vscode';
import { getConfluenceDiagnostics } from './confluenceValidator';

export function registerDiagnostics(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    // Criar uma coleção de diagnósticos
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('confluence');
    context.subscriptions.push(diagnosticCollection);

    function updateDiagnostics(document: vscode.TextDocument) {
        if (document.languageId === 'confluence' || document.fileName.endsWith('.confluence')) {
            const text = document.getText();
            const diags = getConfluenceDiagnostics(text);
            diagnosticCollection.set(document.uri, diags);
        } else {
            diagnosticCollection.delete(document.uri);
        }
    }

    // Verificar documentos já abertos
    vscode.workspace.textDocuments.forEach(doc => {
        updateDiagnostics(doc);
    });

    // Atualizar diagnósticos quando o documento muda
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            updateDiagnostics(event.document);
        })
    );

    // Atualizar diagnósticos quando o documento é salvo
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            updateDiagnostics(document);
        })
    );

    // Atualizar diagnósticos quando o editor ativo muda
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                updateDiagnostics(editor.document);
            }
        })
    );

    // Limpar diagnósticos quando o documento é fechado
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            diagnosticCollection.delete(document.uri);
        })
    );
} 