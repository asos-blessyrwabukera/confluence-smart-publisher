// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { publishConfluenceFile } from './confluenceClient';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "confluence-smart-publisher" is now active!');

	// Comando para publicar arquivo .confluence
	const publishCmd = vscode.commands.registerCommand('confluence-smart-publisher.publishConfluence', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage('Selecione um arquivo .confluence para publicar.');
			return;
		}
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Publicando no Confluence...',
				cancellable: false
			}, async () => {
				const result = await publishConfluenceFile(uri.fsPath);
				vscode.window.showInformationMessage(`Página publicada com sucesso! ID: ${result.pageId}`);
			});
		} catch (e: any) {
			vscode.window.showErrorMessage(`Erro ao publicar no Confluence: ${e.message || e}`);
		}
	});

	context.subscriptions.push(publishCmd);
}

// This method is called when your extension is deactivated
export function deactivate() {}
