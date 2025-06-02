import * as vscode from 'vscode';
import { formatConfluenceDocument } from './confluenceFormatter';

export function registerFormatters(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    // Register formatter for .confluence files
    const confluenceFormatter = vscode.languages.registerDocumentFormattingEditProvider('confluence', {
        async provideDocumentFormattingEdits(document) {
            const text = document.getText();
            let formatted = text;
            try {
                const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
                const numberChapters = config.get('format.numberChapters', false);
                formatted = formatConfluenceDocument(text, numberChapters, outputChannel);
            } catch (e) {
                // If error occurs, return original text
            }
            return [
                vscode.TextEdit.replace(
                    new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(document.lineCount, 0)
                    ),
                    formatted
                )
            ];
        }
    });

    context.subscriptions.push(confluenceFormatter);
} 