// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { setupLocalization } from './i18n';
import { registerCommands, registerDiagnostics, registerFormatters, registerCompletionProviders } from './index';

let outputChannel: vscode.OutputChannel;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	// Inicializar localização
	setupLocalization();
	
	outputChannel = vscode.window.createOutputChannel(vscode.l10n.t('confluence.outputChannel.name'));
	context.subscriptions.push(outputChannel);
	outputChannel.appendLine(vscode.l10n.t('confluence.log.activated'));

	// Registrar diagnósticos
	registerDiagnostics(context, outputChannel);

	// Registrar comandos
	registerCommands(context, outputChannel);

	// Registrar formatadores
	registerFormatters(context, outputChannel);

	// Registrar provedores de completação
	registerCompletionProviders(context, outputChannel);
}

// This method is called when your extension is deactivated
export function deactivate() {
	outputChannel.appendLine(vscode.l10n.t('confluence.log.deactivated'));
}