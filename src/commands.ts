import * as vscode from 'vscode';
import { publishConfluenceFile } from './confluenceClient';

export function registerCommands(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    // Command to publish .confluence file
    const publishCmd = vscode.commands.registerCommand('confluence-smart-publisher.publishConfluence', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath.endsWith('.confluence')) {
            vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFile'));
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t('confluence.progress.publishing'),
                cancellable: false
            }, async () => {
                outputChannel.appendLine(vscode.l10n.t('confluence.log.publishStart', uri.fsPath));
                const result = await publishConfluenceFile(uri.fsPath);
                outputChannel.appendLine(vscode.l10n.t('confluence.log.publishSuccess', result.pageId));
                vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.published', result.pageId));
            });
        } catch (e: any) {
            outputChannel.appendLine(vscode.l10n.t('confluence.log.publishError', e.message || e));
            outputChannel.show(true);
            vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.publishing', e.message || e));
        }
    });

    // ... outros comandos ...

    context.subscriptions.push(publishCmd);
} 