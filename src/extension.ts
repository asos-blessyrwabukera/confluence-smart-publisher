// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { publishConfluenceFile } from './confluenceClient';
import { ConfluenceClient, BodyFormat } from './confluenceClient';
import path from 'path';
import { formatConfluenceDocument } from './confluenceFormatter';
import { getUnclosedOrUnopenedTagDiagnostics, getConfluenceDiagnostics } from './confluenceValidator';
import { allowedTags, allowedValues } from './confluenceSchema';
import { setupLocalization } from './i18n';

let outputChannel: vscode.OutputChannel;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Inicializar localização
	setupLocalization();
	
	outputChannel = vscode.window.createOutputChannel(vscode.l10n.t('confluence.outputChannel.name'));
	context.subscriptions.push(outputChannel);
	outputChannel.appendLine(vscode.l10n.t('confluence.log.activated'));

	// Automatic diagnostics for unclosed/unopened tags
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
				const diags = getUnclosedOrUnopenedTagDiagnostics(event.document.getText());
				diagnostics.set(event.document.uri, diags);
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

	// Use outputChannel for extension logs
	outputChannel.appendLine(vscode.l10n.t('confluence.log.welcome'));

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

	// Command to download page by title
	const getPageByTitleCmd = vscode.commands.registerCommand('confluence-smart-publisher.getPageByTitle', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFolder'));
			return;
		}
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type !== vscode.FileType.Directory) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFolder'));
			return;
		}
		const spaceKey = await vscode.window.showInputBox({ prompt: vscode.l10n.t('confluence.input.spaceKey'), ignoreFocusOut: true });
		if (!spaceKey) {
			vscode.window.showWarningMessage(vscode.l10n.t('confluence.warning.spaceKeyNotProvided'));
			return;
		}
		const title = await vscode.window.showInputBox({ prompt: vscode.l10n.t('confluence.input.pageTitle'), ignoreFocusOut: true });
		if (!title) {
			vscode.window.showWarningMessage(vscode.l10n.t('confluence.warning.pageTitleNotProvided'));
			return;
		}
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: vscode.l10n.t('confluence.progress.downloading'),
				cancellable: false
			}, async () => {
				outputChannel.appendLine(vscode.l10n.t('confluence.log.downloadByTitleSearch', spaceKey, title));
				const client = new ConfluenceClient();
				const page = await client.getPageByTitle(spaceKey, title);
				if (!page) {throw new Error(vscode.l10n.t('confluence.error.pageNotFound'));}
				const pageId = page.id;
				const filePath = await client.downloadConfluencePage(pageId, BodyFormat.STORAGE, uri.fsPath);
				outputChannel.appendLine(vscode.l10n.t('confluence.log.downloadByTitleSuccess', filePath));
				vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.downloaded', filePath));
			});
		} catch (e: any) {
			outputChannel.appendLine(vscode.l10n.t('confluence.log.downloadByTitleError', e.message || e));
			outputChannel.show(true);
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.downloading', e.message || e));
		}
	});

	// Command to download page by ID
	const getPageByIdCmd = vscode.commands.registerCommand('confluence-smart-publisher.getPageById', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFolder'));
			return;
		}
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type !== vscode.FileType.Directory) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFolder'));
			return;
		}
		const pageId = await vscode.window.showInputBox({ prompt: vscode.l10n.t('confluence.input.pageId'), ignoreFocusOut: true });
		if (!pageId) {
			vscode.window.showWarningMessage(vscode.l10n.t('confluence.warning.pageIdNotProvided'));
			return;
		}
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: vscode.l10n.t('confluence.progress.downloading'),
				cancellable: false
			}, async () => {
				outputChannel.appendLine(vscode.l10n.t('confluence.log.downloadByIdSearch', pageId));
				const client = new ConfluenceClient();
				const filePath = await client.downloadConfluencePage(pageId, BodyFormat.STORAGE, uri.fsPath);
				outputChannel.appendLine(vscode.l10n.t('confluence.log.downloadByIdSuccess', filePath));
				vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.downloaded', filePath));
			});
		} catch (e: any) {
			outputChannel.appendLine(vscode.l10n.t('confluence.log.downloadByIdError', e.message || e));
			outputChannel.show(true);
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.downloading', e.message || e));
		}
	});

	// Command to create page from template
	const createPageCmd = vscode.commands.registerCommand('confluence-smart-publisher.createPage', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFolder'));
			return;
		}
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type !== vscode.FileType.Directory) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFolder'));
			return;
		}

		const fileName = await vscode.window.showInputBox({ prompt: vscode.l10n.t('confluence.input.fileName'), ignoreFocusOut: true });
		if (!fileName) {
			vscode.window.showWarningMessage(vscode.l10n.t('confluence.warning.fileNameNotProvided'));
			return;
		}

		const templateId = await vscode.window.showInputBox({ prompt: vscode.l10n.t('confluence.input.templateId'), ignoreFocusOut: true });
		if (!templateId) {
			vscode.window.showWarningMessage(vscode.l10n.t('confluence.warning.templateIdNotProvided'));
			return;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: vscode.l10n.t('confluence.progress.downloading'),
				cancellable: false
			}, async () => {
				outputChannel.appendLine(vscode.l10n.t('confluence.log.createPageDownload', templateId));
				const client = new ConfluenceClient();
				const tempDir = uri.fsPath;
				const templatePath = await client.downloadConfluencePage(templateId, BodyFormat.STORAGE, tempDir);
				const fs = await import('fs');
				let content = fs.readFileSync(templatePath, 'utf-8');
				content = content.replace(/<csp:file_id>.*?<\/csp:file_id>\s*/s, '');
				const newFilePath = path.join(uri.fsPath, fileName.endsWith('.confluence') ? fileName : fileName + '.confluence');
				fs.writeFileSync(newFilePath, content, { encoding: 'utf-8' });
				outputChannel.appendLine(vscode.l10n.t('confluence.log.createPageSuccess', fileName, newFilePath));
				vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.downloaded', newFilePath));
			});
		} catch (e: any) {
			outputChannel.appendLine(vscode.l10n.t('confluence.log.createPageError', e.message || e));
			outputChannel.show(true);
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.downloading', e.message || e));
		}
	});

	// Command to format .confluence file
	const formatConfluenceCmd = vscode.commands.registerCommand('confluence-smart-publisher.formatConfluence', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFileFormat'));
			return;
		}
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const editor = await vscode.window.showTextDocument(document, { preview: false });
			const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
			const numberChapters = config.get('format.numberChapters', false);
			const formatted = formatConfluenceDocument(document.getText(), numberChapters, outputChannel);
			await editor.edit(editBuilder => {
				const start = new vscode.Position(0, 0);
				const end = new vscode.Position(document.lineCount, 0);
				editBuilder.replace(new vscode.Range(start, end), formatted);
			});
			outputChannel.appendLine(vscode.l10n.t('confluence.log.formatSuccess', uri.fsPath));
			vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.formatted'));
		} catch (e: any) {
			outputChannel.appendLine(vscode.l10n.t('confluence.log.formatError', e.message || e));
			outputChannel.show(true);
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.formatting', e.message || e));
		}
	});

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

	// Add suggestions for optional attributes and allowed values
	const optionalAttrsMap: Record<string, string[]> = {
		// Example: 'ac:layout': ['ac:layout-section', 'ac:layout-cell', ...]
		// Fill with base on known attributes of your domain
		// Realistic example:
		'ac:layout': ['ac:layout-section', 'ac:layout-cell'],
		// Add more as needed
	};

	// Register CompletionItemProvider for auto complete of custom tags
	const allCustomTags = Object.keys(allowedTags);
	const tagCompletionProvider = vscode.languages.registerCompletionItemProvider('confluence', {
		provideCompletionItems(document, position) {
			const line = document.lineAt(position).text.substr(0, position.character);
			// Suggestion when typing <
			if (line.endsWith('<')) {
				return allCustomTags.map(tag => {
					const requiredAttrs = allowedTags[tag] || [];
					const optionalAttrs = optionalAttrsMap[tag] || [];
					let snippet = tag;
					let attrSnippets: string[] = [];
					// If it's the root tag, already include the namespace
					if (tag === 'csp:parameters') {
						snippet += ' xmlns:csp="https://confluence.smart.publisher/csp"';
					}
					if (tag === 'ac:layout') {
						snippet += ' xmlns:ac="http://atlassian.com/content"';
					}
					if (requiredAttrs.length > 0) {
						attrSnippets = requiredAttrs.map((attr, idx) => `${attr}="$${idx + 1}"`);
					}
					if (optionalAttrs.length > 0) {
						attrSnippets = attrSnippets.concat(optionalAttrs.map((attr, idx) => `${attr}="$${requiredAttrs.length + idx + 1}"`));
					}
					if (attrSnippets.length > 0) {
						snippet += ' ' + attrSnippets.join(' ') + '>$' + (attrSnippets.length + 1);
					} else {
						snippet += '>$1';
					}
					const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Snippet);
					item.insertText = new vscode.SnippetString(snippet + `</${tag}>`);
					item.detail = 'Custom Confluence tag';
					item.documentation = [
						requiredAttrs.length > 0 ? `Required attributes: ${requiredAttrs.join(', ')}` : undefined,
						optionalAttrs.length > 0 ? `Optional attributes: ${optionalAttrs.join(', ')}` : undefined,
						tag === 'csp:parameters' ? 'Automatically includes the required namespace.' : undefined
					].filter(Boolean).join('\n');
					return item;
				});
			}
			// Suggestion of closing when typing </
			if (line.endsWith('</')) {
				return allCustomTags.map(tag => {
					const item = new vscode.CompletionItem(`/${tag}`, vscode.CompletionItemKind.Snippet);
					item.insertText = `${tag}>`;
					item.detail = 'Close custom tag';
					return item;
				});
			}
			// Suggestion of required and optional attributes when opening a tag
			const tagOpenMatch = line.match(/<([\w\-:]+)\s+([^>]*)?$/);
			if (tagOpenMatch) {
				const tag = tagOpenMatch[1];
				const requiredAttrs = allowedTags[tag] || [];
				const optionalAttrs = optionalAttrsMap[tag] || [];
				const allAttrs = [...requiredAttrs, ...optionalAttrs];
				if (allAttrs.length > 0) {
					return allAttrs.map(attr => {
						const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
						item.insertText = `${attr}="$1"`;
						item.detail = requiredAttrs.includes(attr) ? 'Required attribute' : 'Optional attribute';
						// Suggestion of allowed values for the attribute
						const allowedKey = `${tag}@${attr}`;
						if (allowedValues[allowedKey]) {
							item.documentation = 'Allowed values: ' + allowedValues[allowedKey].join(', ');
						}
						return item;
					});
				}
			}
			// Suggestion of allowed values when typing inside an attribute
			const attrValueMatch = line.match(/<([\w\-:]+)[^>]*\s([\w\-:]+)="[^"]*$/);
			if (attrValueMatch) {
				const tag = attrValueMatch[1];
				const attr = attrValueMatch[2];
				const allowedKey = `${tag}@${attr}`;
				if (allowedValues[allowedKey]) {
					return allowedValues[allowedKey].map((val: string) => {
						const item = new vscode.CompletionItem(val, vscode.CompletionItemKind.Value);
						item.insertText = val;
						item.detail = 'Allowed value';
						return item;
					});
				}
			}
			return undefined;
		}
	}, '<', '/');

	// Command to compare local file with published on Confluence
	const diffWithPublishedCmd = vscode.commands.registerCommand('confluence-smart-publisher.diffWithPublished', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFileCompare'));
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
			const input = await vscode.window.showInputBox({ prompt: vscode.l10n.t('confluence.input.pageId'), ignoreFocusOut: true });
			if (!input) {
				vscode.window.showWarningMessage(vscode.l10n.t('confluence.warning.pageIdNotProvided'));
				return;
			}
			fileId = input;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: vscode.l10n.t('confluence.progress.comparing'),
				cancellable: false
			}, async () => {
				outputChannel.appendLine(vscode.l10n.t('confluence.log.diffComparing', fileId));
				const client = new ConfluenceClient();
				const temp = require('os').tmpdir();
				const fs = await import('fs');
				const path = await import('path');
				const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
				const numberChapters = config.get('format.numberChapters', false);
				// Download the published file
				const publishedPath = await client.downloadConfluencePage(fileId, BodyFormat.STORAGE, temp);

				// Read and format local content
				const localContent = fs.readFileSync(uri.fsPath, 'utf-8');
				const formattedLocal = formatConfluenceDocument(localContent, numberChapters, outputChannel);
				const formattedLocalPath = path.join(temp, 'local_formatted_' + path.basename(uri.fsPath));
				fs.writeFileSync(formattedLocalPath, formattedLocal, { encoding: 'utf-8' });

				// Read and format published content
				const publishedContent = fs.readFileSync(publishedPath, 'utf-8');
				const formattedPublished = formatConfluenceDocument(publishedContent, numberChapters, outputChannel);
				const formattedPublishedPath = path.join(temp, 'published_formatted_' + path.basename(publishedPath));
				fs.writeFileSync(formattedPublishedPath, formattedPublished, { encoding: 'utf-8' });

				outputChannel.appendLine(vscode.l10n.t('confluence.log.diffReady'));
				const leftUri = vscode.Uri.file(formattedLocalPath);
				const rightUri = vscode.Uri.file(formattedPublishedPath);
				const title = vscode.l10n.t('confluence.diff.title', fileId);
				await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
			});
		} catch (e: any) {
			outputChannel.appendLine(vscode.l10n.t('confluence.log.diffError', e.message || e));
			outputChannel.show(true);
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.comparing', e.message || e));
		}
	});

	// Comando para sincronizar arquivo local com o publicado no Confluence
	const syncWithPublishedCmd = vscode.commands.registerCommand('confluence-smart-publisher.syncWithPublished', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFileSync'));
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
			const input = await vscode.window.showInputBox({ prompt: vscode.l10n.t('confluence.input.pageId'), ignoreFocusOut: true });
			if (!input) {
				vscode.window.showWarningMessage(vscode.l10n.t('confluence.warning.pageIdNotProvided'));
				return;
			}
			fileId = input;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: vscode.l10n.t('confluence.progress.synchronizing'),
				cancellable: false
			}, async () => {
				outputChannel.appendLine(vscode.l10n.t('confluence.log.syncDownloading', fileId));
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
				const formattedLocal = formatConfluenceDocument(localContent, numberChapters, outputChannel);
				const formattedLocalPath = path.join(temp, 'local_formatted_' + path.basename(uri.fsPath));
				fs.writeFileSync(formattedLocalPath, formattedLocal, { encoding: 'utf-8' });

				// Lê e formata o conteúdo publicado
				const publishedContent = fs.readFileSync(publishedPath, 'utf-8');
				const formattedPublished = formatConfluenceDocument(publishedContent, numberChapters, outputChannel);
				const formattedPublishedPath = path.join(temp, 'published_formatted_' + path.basename(publishedPath));
				fs.writeFileSync(formattedPublishedPath, formattedPublished, { encoding: 'utf-8' });

				outputChannel.appendLine(vscode.l10n.t('confluence.log.syncShowingDiff'));
				const leftUri = vscode.Uri.file(formattedLocalPath);
				const rightUri = vscode.Uri.file(formattedPublishedPath);
				const title = `Diff: Local (formatted) ↔ Published (formatted) (${fileId})`;
				await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);

				const escolha = await vscode.window.showQuickPick([
					{
						label: vscode.l10n.t('Update local file with online content'),
						detail: vscode.l10n.t('Overwrites the local file with content downloaded from Confluence.')
					},
					{
						label: vscode.l10n.t('Update Confluence with local content'),
						detail: vscode.l10n.t('Publishes the local file to Confluence.')
					},
					{
						label: vscode.l10n.t('Cancel'),
						detail: vscode.l10n.t('Makes no changes.')
					}
				], { placeHolder: vscode.l10n.t('Choose synchronization action') });

				if (!escolha || escolha.label === vscode.l10n.t('Cancel')) {
					outputChannel.appendLine(vscode.l10n.t('confluence.log.syncCancelled'));
					return;
				}

				if (escolha.label === vscode.l10n.t('Update local file with online content')) {
					fs.writeFileSync(uri.fsPath, publishedContent, { encoding: 'utf-8' });
					outputChannel.appendLine(vscode.l10n.t('confluence.log.syncLocalSuccess'));
					vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.syncLocalUpdated'));
				} else if (escolha.label === vscode.l10n.t('Update Confluence with local content')) {
					await vscode.window.withProgress({
						location: vscode.ProgressLocation.Notification,
						title: vscode.l10n.t('confluence.progress.uploadingContent'),
						cancellable: false
					}, async () => {
						outputChannel.appendLine(vscode.l10n.t('confluence.log.syncPublishing'));
						await publishConfluenceFile(uri.fsPath);
						outputChannel.appendLine(vscode.l10n.t('confluence.log.syncPublishSuccess'));
						vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.syncPublishedUpdated'));
					});
				}
			});
		} catch (e: any) {
			outputChannel.appendLine(vscode.l10n.t('confluence.log.syncError', e.message || e));
			outputChannel.show(true);
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.synchronizing', e.message || e));
		}
	});

	// Comando para definir emoji do título com picker visual
	const setEmojiTitleWebviewCmd = vscode.commands.registerCommand('confluence-smart-publisher.setEmojiTitle', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFileEmoji'));
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'cspEmojiPicker',
			vscode.l10n.t('confluence.webview.title.emojiPicker'),
			vscode.ViewColumn.Active,
			{
				enableScripts: true,
			}
		);

		panel.webview.html = getEmojiPickerHtml(panel.webview, context.extensionUri);

		panel.webview.onDidReceiveMessage(async (message) => {
			if (message.command === 'emojiSelected') {
				const emoji = message.emoji;
				const codePoint = emoji.codePointAt(0)?.toString(16);
				if (!codePoint) {
					vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.emojiCode'));
					return;
				}
				const fs = await import('fs');
				let content = fs.readFileSync(uri.fsPath, 'utf-8');
				const cspParamsRegex = /<csp:parameters[\s\S]*?<\/csp:parameters>/gi;
				const cspPropertiesRegex = /<csp:properties>[\s\S]*?<\/csp:properties>/i;
				const emojiKeysRegex = /<csp:key>emoji-title-draft<\/csp:key>\s*<csp:value>[a-zA-Z0-9]+<\/csp:value>\s*<csp:key>emoji-title-published<\/csp:key>\s*<csp:value>[a-zA-Z0-9]+<\/csp:value>/;
				const emojiProps = `<csp:key>emoji-title-draft</csp:key>\n  <csp:value>${codePoint}</csp:value>\n  <csp:key>emoji-title-published</csp:key>\n  <csp:value>${codePoint}</csp:value>`;
				let novoContent = content;
				if (cspParamsRegex.test(content)) {
					novoContent = content.replace(cspParamsRegex, (paramsBlock) => {
						if (cspPropertiesRegex.test(paramsBlock)) {
							return paramsBlock.replace(cspPropertiesRegex, (propertiesBlock) => {
								if (emojiKeysRegex.test(propertiesBlock)) {
									return propertiesBlock.replace(emojiKeysRegex, emojiProps);
								} else {
									return propertiesBlock.replace(/(<\/csp:properties>)/, `  ${emojiProps}\n$1`);
								}
							});
						} else {
							return paramsBlock.replace(/(<\/csp:parameters>)/, `  <csp:properties>\n  ${emojiProps}\n  </csp:properties>\n$1`);
						}
					});
				} else {
					novoContent = vscode.l10n.t('confluence.webview.html.script.parameters', emojiProps) + content;
				}
				fs.writeFileSync(uri.fsPath, novoContent, { encoding: 'utf-8' });
				vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.emojiSet'));
				panel.dispose();
			}
		});
	});

	function getEmojiPickerHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const nonce = Date.now().toString();
		const emojiMartCdn = vscode.l10n.t('confluence.webview.html.script.cdn');
		return `
		<!DOCTYPE html>
		<html lang="${vscode.l10n.t('confluence.webview.html.lang')}">
		<head>
			<meta charset="${vscode.l10n.t('confluence.webview.html.charset')}">
			<meta http-equiv="Content-Security-Policy" content="${vscode.l10n.t('confluence.webview.html.script.csp', webview.cspSource)}">
			<meta name="viewport" content="${vscode.l10n.t('confluence.webview.html.viewport')}">
			<title>${vscode.l10n.t('confluence.webview.html.title')}</title>
		</head>
		<body>
			<div id="${vscode.l10n.t('confluence.webview.html.picker.id')}"></div>
			<script src="${emojiMartCdn}"></script>
			<script nonce="${vscode.l10n.t('confluence.webview.html.script.nonce', nonce)}">
				const picker = new EmojiMart.Picker({
					onEmojiSelect: (${vscode.l10n.t('confluence.webview.html.script.emoji')}) => {
						const vscode = ${vscode.l10n.t('confluence.webview.html.script.acquire')}();
						vscode.${vscode.l10n.t('confluence.webview.html.script.postMessage')}({ 
							command: '${vscode.l10n.t('confluence.webview.html.script.command')}', 
							emoji: ${vscode.l10n.t('confluence.webview.html.script.emoji')}.${vscode.l10n.t('confluence.webview.html.script.native')} 
						});
					},
					locale: '${vscode.l10n.t('confluence.webview.html.script.locale')}',
					theme: '${vscode.l10n.t('confluence.webview.html.script.theme')}',
				});
				document.getElementById('${vscode.l10n.t('confluence.webview.html.picker.id')}').${vscode.l10n.t('confluence.webview.html.script.appendChild')}(picker);
			</script>
		</body>
		</html>
		`;
	}

	// Comando para decodificar entidades HTML em arquivos .confluence
	const decodeHtmlCmd = vscode.commands.registerCommand('confluence-smart-publisher.decodeHtml', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.selectFileDecode'));
			return;
		}
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const editor = await vscode.window.showTextDocument(document, { preview: false });
			const { decodeHtmlEntities } = await import('./confluenceFormatter.js');
			const decoded = decodeHtmlEntities(document.getText());
			await editor.edit(editBuilder => {
				const start = new vscode.Position(0, 0);
				const end = new vscode.Position(document.lineCount, 0);
				editBuilder.replace(new vscode.Range(start, end), decoded);
			});
			outputChannel.appendLine(vscode.l10n.t('confluence.log.decodeSuccess', uri.fsPath));
			vscode.window.showInformationMessage(vscode.l10n.t('confluence.success.htmlDecoded'));
		} catch (e: any) {
			outputChannel.appendLine(vscode.l10n.t('confluence.log.decodeError', e.message || e));
			outputChannel.show(true);
			vscode.window.showErrorMessage(vscode.l10n.t('confluence.error.downloading', e.message || e));
		}
	});

	context.subscriptions.push(publishCmd, getPageByTitleCmd, getPageByIdCmd, createPageCmd, confluenceFormatter, tagCompletionProvider, formatConfluenceCmd, diffWithPublishedCmd, syncWithPublishedCmd, setEmojiTitleWebviewCmd, decodeHtmlCmd);
}

// This method is called when your extension is deactivated
export function deactivate() {
	outputChannel.appendLine(vscode.l10n.t('confluence.log.deactivated'));
}