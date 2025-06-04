import * as vscode from 'vscode';
import { getUnclosedOrUnopenedTagDiagnostics, getConfluenceDiagnostics } from './confluenceValidator';

export function registerDiagnostics(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    const diagnostics = vscode.languages.createDiagnosticCollection('confluence');
    context.subscriptions.push(diagnostics);

    function updateDiagnostics(document: vscode.TextDocument) {
        if (document.languageId === 'xml' || document.fileName.endsWith('.confluence')) {
            const diags1 = getUnclosedOrUnopenedTagDiagnostics(document.getText());
            const diags2 = getConfluenceDiagnostics(document.getText());
            diagnostics.set(document.uri, [...diags1, ...diags2]);
        }
    }

    // Update diagnostics when opening
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(updateDiagnostics)
    );

    // Update diagnostics when changing active editor
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {updateDiagnostics(editor.document);}
        })
    );

    // Update diagnostics when saving
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(updateDiagnostics)
    );

    // Update diagnostics when editing document (while typing)
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'xml' || event.document.fileName.endsWith('.confluence')) {
                const diags1 = getUnclosedOrUnopenedTagDiagnostics(event.document.getText());
                const diags2 = getConfluenceDiagnostics(event.document.getText());
                diagnostics.set(event.document.uri, [...diags1, ...diags2]);
            }
        })
    );

    // Remove diagnostics when deleting files
    context.subscriptions.push(
        vscode.workspace.onDidDeleteFiles(event => {
            for (const file of event.files) {
                diagnostics.delete(file);
            }
        })
    );
} 