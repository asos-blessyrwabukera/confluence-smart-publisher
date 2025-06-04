import * as vscode from 'vscode';
import { publishConfluenceFile, ConfluenceClient, BodyFormat } from './confluenceClient';
import path from 'path';
import { formatConfluenceDocument, decodeHtmlEntities } from './confluenceFormatter';
import { getUnclosedOrUnopenedTagDiagnostics, getConfluenceDiagnostics } from './confluenceValidator';
import { allowedTags, allowedValues, allowedHierarchy } from './confluenceSchema';
import { getEmojiPickerHtml } from './webview';

export function registerCommands(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    // Command to publish .confluence file
    const publishCmd = vscode.commands.registerCommand('confluence-smart-publisher.publishConfluence', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath.endsWith('.confluence')) {
            vscode.window.showErrorMessage('Select a .confluence file to publish.');
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Publishing to Confluence...',
                cancellable: false
            }, async () => {
                outputChannel.appendLine(`[Publish] Starting publication of file: "${uri.fsPath}"`);
                const result = await publishConfluenceFile(uri.fsPath);
                outputChannel.appendLine(`[Publish] Page published successfully! ID: ${result.pageId}`);
                vscode.window.showInformationMessage(`Page published successfully! ID: ${result.pageId}`);
            });
        } catch (e: any) {
            outputChannel.appendLine(`[Publish] Error: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error publishing to Confluence: ${e.message || e}`);
        }
    });

    // Command to get page by title
    const getPageByTitleCmd = vscode.commands.registerCommand('confluence-smart-publisher.getPageByTitle', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('Select a folder to save the page.');
            return;
        }
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type !== vscode.FileType.Directory) {
            vscode.window.showErrorMessage('Select a folder to save the page.');
            return;
        }
        const spaceKey = await vscode.window.showInputBox({ prompt: 'Enter the Confluence Space Key', ignoreFocusOut: true });
        if (!spaceKey) {
            vscode.window.showWarningMessage('Space Key not provided.');
            return;
        }
        const title = await vscode.window.showInputBox({ prompt: 'Enter the exact page title', ignoreFocusOut: true });
        if (!title) {
            vscode.window.showWarningMessage('Title not provided.');
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading page from Confluence...',
                cancellable: false
            }, async () => {
                outputChannel.appendLine(`[Download by Title] Searching page: SpaceKey=${spaceKey}, Title=${title}`);
                const client = new ConfluenceClient();
                const page = await client.getPageByTitle(spaceKey, title);
                if (!page) {throw new Error('Page not found.');}
                const pageId = page.id;
                const filePath = await client.downloadConfluencePage(pageId, BodyFormat.STORAGE, uri.fsPath);
                outputChannel.appendLine(`[Download by Title] Page downloaded to: "${filePath}"`);
                vscode.window.showInformationMessage(`Page downloaded to: "${filePath}"`);
            });
        } catch (e: any) {
            outputChannel.appendLine(`[Download by Title] Error: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error downloading page: ${e.message || e}`);
        }
    });

    // Command to get page by ID
    const getPageByIdCmd = vscode.commands.registerCommand('confluence-smart-publisher.getPageById', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('Select a folder to save the page.');
            return;
        }
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type !== vscode.FileType.Directory) {
            vscode.window.showErrorMessage('Select a folder to save the page.');
            return;
        }
        const pageId = await vscode.window.showInputBox({ prompt: 'Enter the Confluence Page ID', ignoreFocusOut: true });
        if (!pageId) {
            vscode.window.showWarningMessage('Page ID not provided.');
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading page from Confluence...',
                cancellable: false
            }, async () => {
                outputChannel.appendLine(`[Download by ID] Searching page: ID=${pageId}`);
                const client = new ConfluenceClient();
                const filePath = await client.downloadConfluencePage(pageId, BodyFormat.STORAGE, uri.fsPath);
                outputChannel.appendLine(`[Download by ID] Page downloaded to: "${filePath}"`);
                vscode.window.showInformationMessage(`Page downloaded to: "${filePath}"`);
            });
        } catch (e: any) {
            outputChannel.appendLine(`[Download by ID] Error: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error downloading page: ${e.message || e}`);
        }
    });

    // Command to create new page
    const createPageCmd = vscode.commands.registerCommand('confluence-smart-publisher.createPage', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('Select a folder to create the new page.');
            return;
        }
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type !== vscode.FileType.Directory) {
            vscode.window.showErrorMessage('Select a folder to create the new page.');
            return;
        }

        const nomeArquivo = await vscode.window.showInputBox({ prompt: 'Enter the file name (ex: NewPage.confluence)', ignoreFocusOut: true });
        if (!nomeArquivo) {
            vscode.window.showWarningMessage('File name not provided.');
            return;
        }

        const modeloId = await vscode.window.showInputBox({ prompt: 'Enter the Template File ID', ignoreFocusOut: true });
        if (!modeloId) {
            vscode.window.showWarningMessage('Template file ID not provided.');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading template file from Confluence...',
                cancellable: false
            }, async () => {
                outputChannel.appendLine(`[Create Page] Downloading template: ID=${modeloId}`);
                const client = new ConfluenceClient();
                const tempDir = uri.fsPath;
                const modeloPath = await client.downloadConfluencePage(modeloId, BodyFormat.STORAGE, tempDir);
                const fs = await import('fs');
                let conteudo = fs.readFileSync(modeloPath, 'utf-8');
                conteudo = conteudo.replace(/<csp:file_id>.*?<\/csp:file_id>\s*/s, '');
                const novoArquivoPath = path.join(uri.fsPath, nomeArquivo.endsWith('.confluence') ? nomeArquivo : nomeArquivo + '.confluence');
                fs.writeFileSync(novoArquivoPath, conteudo, { encoding: 'utf-8' });
                outputChannel.appendLine(`[Create Page] File "${nomeArquivo}" created at "${novoArquivoPath}"`);
                vscode.window.showInformationMessage(`File "${nomeArquivo}" created successfully!`);
            });
        } catch (e: any) {
            outputChannel.appendLine(`[Create Page] Error: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error creating page: ${e.message || e}`);
        }
    });

    // Command to format Confluence document
    const formatConfluenceCmd = vscode.commands.registerCommand('confluence-smart-publisher.formatConfluence', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath.endsWith('.confluence')) {
            vscode.window.showErrorMessage('Select a .confluence file to format.');
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            outputChannel.appendLine(`[Format] Starting formatting of file: "${uri.fsPath}"`);

            const editor = await vscode.window.showTextDocument(document, { preview: false });
            const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
            const numberChapters = config.get('format.numberChapters', false);
            const formatted = formatConfluenceDocument(document.getText(), numberChapters);
            await editor.edit(editBuilder => {
                const start = new vscode.Position(0, 0);
                const end = new vscode.Position(document.lineCount, 0);
                editBuilder.replace(new vscode.Range(start, end), formatted);
            });
            outputChannel.appendLine(`[Format] File formatted: "${uri.fsPath}"`);
            vscode.window.showInformationMessage('File formatted successfully!');
        } catch (e: any) {
            outputChannel.appendLine(`[Format] Error formatting: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error formatting file: ${e.message || e}`);
        }
    });

    // Command to compare local with published version
    const diffWithPublishedCmd = vscode.commands.registerCommand('confluence-smart-publisher.diffWithPublished', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath.endsWith('.confluence')) {
            vscode.window.showErrorMessage('Select a .confluence file to compare.');
            return;
        }
        const fs = await import('fs');
        let fileId = '';
        try {
            const content = fs.readFileSync(uri.fsPath, 'utf-8');
            const match = content.match(/<csp:file_id>(\d+)<\/csp:file_id>/);
            if (match) {
                fileId = match[1];
            }
        } catch (e) {}

        if (!fileId) {
            const input = await vscode.window.showInputBox({ prompt: 'Enter the Confluence Page ID to compare', ignoreFocusOut: true });
            if (!input) {
                vscode.window.showWarningMessage('Page ID not provided.');
                return;
            }
            fileId = input;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading published version from Confluence...',
                cancellable: false
            }, async () => {
                outputChannel.appendLine(`[Diff] Comparing local file with published. fileId=${fileId}`);
                const client = new ConfluenceClient();
                const temp = require('os').tmpdir();
                const fs = await import('fs');
                const path = await import('path');
                const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
                const numberChapters = config.get('format.numberChapters', false);
                // Baixa o arquivo publicado
                const publishedPath = await client.downloadConfluencePage(fileId, BodyFormat.STORAGE, temp);

                // Lê e formata o conteúdo local
                const localContent = fs.readFileSync(uri.fsPath, 'utf-8');
                const formattedLocal = formatConfluenceDocument(localContent, numberChapters);
                const formattedLocalPath = path.join(temp, 'local_formatted_' + path.basename(uri.fsPath));
                fs.writeFileSync(formattedLocalPath, formattedLocal, { encoding: 'utf-8' });

                // Lê e formata o conteúdo publicado
                const publishedContent = fs.readFileSync(publishedPath, 'utf-8');
                const formattedPublished = formatConfluenceDocument(publishedContent, numberChapters);
                const formattedPublishedPath = path.join(temp, 'published_formatted_' + path.basename(publishedPath));
                fs.writeFileSync(formattedPublishedPath, formattedPublished, { encoding: 'utf-8' });

                outputChannel.appendLine(`[Diff] Formatted files ready for diff.`);
                const leftUri = vscode.Uri.file(formattedLocalPath);
                const rightUri = vscode.Uri.file(formattedPublishedPath);
                const title = `Diff: Local (formatted) ↔ Published (formatted) (${fileId})`;
                await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
            });
        } catch (e: any) {
            outputChannel.appendLine(`[Diff] Error comparing: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error comparing: ${e.message || e}`);
        }
    });

    // Command to sync with published version
    const syncWithPublishedCmd = vscode.commands.registerCommand('confluence-smart-publisher.syncWithPublished', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath.endsWith('.confluence')) {
            vscode.window.showErrorMessage('Select a .confluence file to sync.');
            return;
        }
        const fs = await import('fs');
        let fileId = '';
        try {
            const content = fs.readFileSync(uri.fsPath, 'utf-8');
            const match = content.match(/<csp:file_id>(\d+)<\/csp:file_id>/);
            if (match) {
                fileId = match[1];
            }
        } catch (e) {}

        if (!fileId) {
            const input = await vscode.window.showInputBox({ prompt: 'Enter the Confluence Page ID to sync', ignoreFocusOut: true });
            if (!input) {
                vscode.window.showWarningMessage('Page ID not provided.');
                return;
            }
            fileId = input;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading published version from Confluence...',
                cancellable: false
            }, async () => {
                outputChannel.appendLine(`[Sync] Downloading published version for synchronization. fileId=${fileId}`);
                const client = new ConfluenceClient();
                const temp = require('os').tmpdir();
                const fs = await import('fs');
                const path = await import('path');
                const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
                const numberChapters = config.get('format.numberChapters', false);
                // Baixa o arquivo publicado
                const publishedPath = await client.downloadConfluencePage(fileId, BodyFormat.STORAGE, temp);

                // Lê e formata o conteúdo local
                const localContent = fs.readFileSync(uri.fsPath, 'utf-8');
                const formattedLocal = formatConfluenceDocument(localContent, numberChapters);
                const formattedLocalPath = path.join(temp, 'local_formatted_' + path.basename(uri.fsPath));
                fs.writeFileSync(formattedLocalPath, formattedLocal, { encoding: 'utf-8' });

                // Lê e formata o conteúdo publicado
                const publishedContent = fs.readFileSync(publishedPath, 'utf-8');
                const formattedPublished = formatConfluenceDocument(publishedContent, numberChapters);
                const formattedPublishedPath = path.join(temp, 'published_formatted_' + path.basename(publishedPath));
                fs.writeFileSync(formattedPublishedPath, formattedPublished, { encoding: 'utf-8' });

                outputChannel.appendLine(`[Sync] Showing diff for user decision.`);
                const leftUri = vscode.Uri.file(formattedLocalPath);
                const rightUri = vscode.Uri.file(formattedPublishedPath);
                const title = `Diff: Local (formatted) ↔ Published (formatted) (${fileId})`;
                await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);

                const escolha = await vscode.window.showQuickPick([
                    {
                        label: 'Update local file with online content',
                        detail: 'Overwrites the local file with the content downloaded from Confluence.'
                    },
                    {
                        label: 'Update Confluence with local content',
                        detail: 'Publishes the local file to Confluence.'
                    },
                    {
                        label: 'Cancel',
                        detail: 'No changes will be made.'
                    }
                ], { placeHolder: 'Choose sync action' });

                if (!escolha || escolha.label === 'Cancel') {
                    outputChannel.appendLine('[Sync] Sync cancelled by user.');
                    return;
                }

                if (escolha.label === 'Update local file with online content') {
                    fs.writeFileSync(uri.fsPath, publishedContent, { encoding: 'utf-8' });
                    outputChannel.appendLine('[Sync] Local file updated successfully!');
                    vscode.window.showInformationMessage('Local file updated successfully!');
                } else if (escolha.label === 'Update Confluence with local content') {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Publishing local content to Confluence...',
                        cancellable: false
                    }, async () => {
                        outputChannel.appendLine('[Sync] Publishing local content to Confluence...');
                        await publishConfluenceFile(uri.fsPath);
                        outputChannel.appendLine('[Sync] Local content published successfully!');
                        vscode.window.showInformationMessage('Local content published to Confluence successfully!');
                    });
                }
            });
        } catch (e: any) {
            outputChannel.appendLine(`[Sync] Error syncing: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error syncing: ${e.message || e}`);
        }
    });

    // Command to set emoji title
    const setEmojiTitleCmd = vscode.commands.registerCommand('confluence-smart-publisher.setEmojiTitle', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath.endsWith('.confluence')) {
            vscode.window.showErrorMessage('Select a .confluence file to set the emoji.');
            return;
        }

        // Criar e mostrar o painel do webview
        const panel = vscode.window.createWebviewPanel(
            'emojiPicker',
            'Select Emoji',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Configurar o HTML do webview
        panel.webview.html = getEmojiPickerHtml(panel.webview, context.extensionUri);

        // Lidar com mensagens do webview
        panel.webview.onDidReceiveMessage(
            async message => {
                if (message.command === 'emojiSelected') {
                    const emoji = message.emoji;
                    try {
                        const fs = await import('fs');
                        const content = fs.readFileSync(uri.fsPath, 'utf-8');
                        
                        // Verifica se já existe um emoji no título
                        const titleMatch = content.match(/<csp:title>(.*?)<\/csp:title>/);
                        if (!titleMatch) {
                            throw new Error('Title not found in file.');
                        }

                        const currentTitle = titleMatch[1];
                        const newTitle = emoji + ' ' + currentTitle.replace(/^[^\s]+\s/, ''); // Remove emoji existente se houver

                        const newContent = content.replace(
                            /<csp:title>.*?<\/csp:title>/,
                            `<csp:title>${newTitle}</csp:title>`
                        );

                        fs.writeFileSync(uri.fsPath, newContent, 'utf-8');
                        outputChannel.appendLine(`[Emoji] Emoji set successfully: ${emoji}`);
                        vscode.window.showInformationMessage(`Emoji set successfully: ${emoji}`);
                        panel.dispose();
                    } catch (e: any) {
                        outputChannel.appendLine(`[Emoji] Error setting emoji: ${e.message || e}`);
                        outputChannel.show(true);
                        vscode.window.showErrorMessage(`Error setting emoji: ${e.message || e}`);
                    }
                }
            },
            undefined,
            context.subscriptions
        );
    });

    // Command to decode HTML entities
    const decodeHtmlCmd = vscode.commands.registerCommand('confluence-smart-publisher.decodeHtml', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath.endsWith('.confluence')) {
            vscode.window.showErrorMessage('Select a .confluence file to decode.');
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document, { preview: false });
            
            const content = document.getText();
            const decodedContent = decodeHtmlEntities(content);

            await editor.edit(editBuilder => {
                const start = new vscode.Position(0, 0);
                const end = new vscode.Position(document.lineCount, 0);
                editBuilder.replace(new vscode.Range(start, end), decodedContent);
            });

            outputChannel.appendLine(`[Decode HTML] File decoded: "${uri.fsPath}"`);
            vscode.window.showInformationMessage('HTML entities decoded successfully!');
        } catch (e: any) {
            outputChannel.appendLine(`[Decode HTML] Error decoding: ${e.message || e}`);
            outputChannel.show(true);
            vscode.window.showErrorMessage(`Error decoding HTML entities: ${e.message || e}`);
        }
    });

    // Register all commands
    context.subscriptions.push(
        publishCmd,
        getPageByTitleCmd,
        getPageByIdCmd,
        createPageCmd,
        formatConfluenceCmd,
        diffWithPublishedCmd,
        syncWithPublishedCmd,
        setEmojiTitleCmd,
        decodeHtmlCmd
    );
} 