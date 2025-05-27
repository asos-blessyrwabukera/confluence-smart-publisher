// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { publishConfluenceFile } from './confluenceClient';
import { ConfluenceClient, BodyFormat } from './confluenceClient';
import path from 'path';
import { formatConfluenceDocument } from './confluenceFormatter';
import { getUnclosedOrUnopenedTagDiagnostics } from './confluenceValidator';
import { allowedTags, allowedValues, allowedHierarchy } from './confluenceSchema';
import * as cheerio from 'cheerio';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Confluence Smart Publisher');
	context.subscriptions.push(outputChannel);
	outputChannel.appendLine('Confluence Smart Publisher ativado!');

	// Diagnóstico automático de tags não fechadas/abertas
	const diagnostics = vscode.languages.createDiagnosticCollection('confluence');
	context.subscriptions.push(diagnostics);

	function updateDiagnostics(document: vscode.TextDocument) {
		if (document.languageId === 'xml' || document.fileName.endsWith('.confluence')) {
			const diags = getUnclosedOrUnopenedTagDiagnostics(document.getText());
			diagnostics.set(document.uri, diags);
		}
	}

	// Atualiza diagnósticos ao abrir
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(updateDiagnostics)
	);
	// Atualiza diagnósticos ao trocar de editor ativo
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {updateDiagnostics(editor.document);}
		})
	);
	// Atualiza diagnósticos ao salvar
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(updateDiagnostics)
	);
	// Atualiza diagnósticos ao editar o documento (enquanto digita)
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document.languageId === 'xml' || event.document.fileName.endsWith('.confluence')) {
				const diags = getUnclosedOrUnopenedTagDiagnostics(event.document.getText());
				diagnostics.set(event.document.uri, diags);
			}
		})
	);

	// Remove diagnósticos ao excluir arquivos
	context.subscriptions.push(
		vscode.workspace.onDidDeleteFiles(event => {
			for (const file of event.files) {
				diagnostics.delete(file);
			}
		})
	);

	// Use o outputChannel para logs da extensão
	outputChannel.appendLine('Congratulations, your extension "confluence-smart-publisher" is now active!');

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
				outputChannel.appendLine(`[Publicar] Iniciando publicação do arquivo: ${uri.fsPath}`);
				const result = await publishConfluenceFile(uri.fsPath);
				outputChannel.appendLine(`[Publicar] Página publicada com sucesso! ID: ${result.pageId}`);
				vscode.window.showInformationMessage(`Página publicada com sucesso! ID: ${result.pageId}`);
			});
		} catch (e: any) {
			outputChannel.appendLine(`[Publicar] Erro ao publicar: ${e.message || e}`);
			outputChannel.show(true);
			vscode.window.showErrorMessage(`Erro ao publicar no Confluence: ${e.message || e}`);
		}
	});

	// Comando para baixar página por título
	const getPageByTitleCmd = vscode.commands.registerCommand('confluence-smart-publisher.getPageByTitle', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath) {
			vscode.window.showErrorMessage('Selecione uma pasta para salvar a página.');
			return;
		}
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type !== vscode.FileType.Directory) {
			vscode.window.showErrorMessage('Selecione uma pasta para salvar a página.');
			return;
		}
		const spaceKey = await vscode.window.showInputBox({ prompt: 'Informe o Space Key do Confluence', ignoreFocusOut: true });
		if (!spaceKey) {
			vscode.window.showWarningMessage('Space Key não informado.');
			return;
		}
		const title = await vscode.window.showInputBox({ prompt: 'Informe o título exato da página', ignoreFocusOut: true });
		if (!title) {
			vscode.window.showWarningMessage('Título não informado.');
			return;
		}
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Baixando página do Confluence...',
				cancellable: false
			}, async () => {
				outputChannel.appendLine(`[Download por Título] Buscando página: SpaceKey=${spaceKey}, Título=${title}`);
				const client = new ConfluenceClient();
				const page = await client.getPageByTitle(spaceKey, title);
				if (!page) {throw new Error('Página não encontrada.');}
				const pageId = page.id;
				const filePath = await client.downloadConfluencePage(pageId, BodyFormat.STORAGE, uri.fsPath);
				outputChannel.appendLine(`[Download por Título] Página baixada em: ${filePath}`);
				vscode.window.showInformationMessage(`Página baixada em: ${filePath}`);
			});
		} catch (e: any) {
			outputChannel.appendLine(`[Download por Título] Erro: ${e.message || e}`);
			outputChannel.show(true);
			vscode.window.showErrorMessage(`Erro ao baixar página: ${e.message || e}`);
		}
	});

	// Comando para baixar página por ID
	const getPageByIdCmd = vscode.commands.registerCommand('confluence-smart-publisher.getPageById', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath) {
			vscode.window.showErrorMessage('Selecione uma pasta para salvar a página.');
			return;
		}
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type !== vscode.FileType.Directory) {
			vscode.window.showErrorMessage('Selecione uma pasta para salvar a página.');
			return;
		}
		const pageId = await vscode.window.showInputBox({ prompt: 'Informe o ID da página do Confluence', ignoreFocusOut: true });
		if (!pageId) {
			vscode.window.showWarningMessage('ID da página não informado.');
			return;
		}
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Baixando página do Confluence...',
				cancellable: false
			}, async () => {
				outputChannel.appendLine(`[Download por ID] Buscando página: ID=${pageId}`);
				const client = new ConfluenceClient();
				const filePath = await client.downloadConfluencePage(pageId, BodyFormat.STORAGE, uri.fsPath);
				outputChannel.appendLine(`[Download por ID] Página baixada em: ${filePath}`);
				vscode.window.showInformationMessage(`Página baixada em: ${filePath}`);
			});
		} catch (e: any) {
			outputChannel.appendLine(`[Download por ID] Erro: ${e.message || e}`);
			outputChannel.show(true);
			vscode.window.showErrorMessage(`Erro ao baixar página: ${e.message || e}`);
		}
	});

	// Comando para criar página a partir de modelo
	const createPageCmd = vscode.commands.registerCommand('confluence-smart-publisher.createPage', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath) {
			vscode.window.showErrorMessage('Selecione uma pasta para criar a nova página.');
			return;
		}
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type !== vscode.FileType.Directory) {
			vscode.window.showErrorMessage('Selecione uma pasta para criar a nova página.');
			return;
		}

		const nomeArquivo = await vscode.window.showInputBox({ prompt: 'Digite o nome do novo arquivo (ex: NovaPagina.confluence)', ignoreFocusOut: true });
		if (!nomeArquivo) {
			vscode.window.showWarningMessage('Nome do arquivo não informado.');
			return;
		}

		const modeloId = await vscode.window.showInputBox({ prompt: 'Digite o ID do arquivo modelo', ignoreFocusOut: true });
		if (!modeloId) {
			vscode.window.showWarningMessage('ID do arquivo modelo não informado.');
			return;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Baixando arquivo modelo do Confluence...',
				cancellable: false
			}, async () => {
				outputChannel.appendLine(`[Criar Página] Baixando modelo: ID=${modeloId}`);
				const client = new ConfluenceClient();
				const tempDir = uri.fsPath;
				const modeloPath = await client.downloadConfluencePage(modeloId, BodyFormat.STORAGE, tempDir);
				const fs = await import('fs');
				let conteudo = fs.readFileSync(modeloPath, 'utf-8');
				conteudo = conteudo.replace(/<csp:file_id>.*?<\/csp:file_id>\s*/s, '');
				const novoArquivoPath = path.join(uri.fsPath, nomeArquivo.endsWith('.confluence') ? nomeArquivo : nomeArquivo + '.confluence');
				fs.writeFileSync(novoArquivoPath, conteudo, { encoding: 'utf-8' });
				outputChannel.appendLine(`[Criar Página] Arquivo ${nomeArquivo} criado em ${novoArquivoPath}`);
				vscode.window.showInformationMessage(`Arquivo ${nomeArquivo} criado com sucesso!`);
			});
		} catch (e: any) {
			outputChannel.appendLine(`[Criar Página] Erro: ${e.message || e}`);
			outputChannel.show(true);
			vscode.window.showErrorMessage(`Erro ao criar página: ${e.message || e}`);
		}
	});

	// Comando para formatar arquivo .confluence
	const formatConfluenceCmd = vscode.commands.registerCommand('confluence-smart-publisher.formatConfluence', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage('Selecione um arquivo .confluence para formatar.');
			return;
		}
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const editor = await vscode.window.showTextDocument(document, { preview: false });
			const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
			const numberChapters = config.get('format.numberChapters', false);
			const formatted = formatConfluenceDocument(document.getText(), numberChapters);
			await editor.edit(editBuilder => {
				const start = new vscode.Position(0, 0);
				const end = new vscode.Position(document.lineCount, 0);
				editBuilder.replace(new vscode.Range(start, end), formatted);
			});
			outputChannel.appendLine(`[Formatar] Arquivo formatado: ${uri.fsPath}`);
			vscode.window.showInformationMessage('Arquivo formatado com sucesso!');
		} catch (e: any) {
			outputChannel.appendLine(`[Formatar] Erro ao formatar: ${e.message || e}`);
			outputChannel.show(true);
			vscode.window.showErrorMessage(`Erro ao formatar arquivo: ${e.message || e}`);
		}
	});

	// Registrar o formatter para arquivos .confluence
	const confluenceFormatter = vscode.languages.registerDocumentFormattingEditProvider('confluence', {
		async provideDocumentFormattingEdits(document) {
			const text = document.getText();
			let formatted = text;
			try {
				const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
				const numberChapters = config.get('format.numberChapters', false);
				formatted = formatConfluenceDocument(text, numberChapters);
			} catch (e) {
				// Se der erro, retorna o texto original
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

	// Adicionar sugestões para atributos opcionais e valores permitidos
	const optionalAttrsMap: Record<string, string[]> = {
		// Exemplo: 'ac:layout': ['ac:layout-section', 'ac:layout-cell', ...]
		// Preencher com base nos atributos opcionais conhecidos do seu domínio
		// Exemplo realista:
		'ac:layout': ['ac:layout-section', 'ac:layout-cell'],
		// Adicione outros conforme necessário
	};

	// Registrar o CompletionItemProvider para auto complete de tags customizadas
	const allCustomTags = Object.keys(allowedTags);
	const tagCompletionProvider = vscode.languages.registerCompletionItemProvider('confluence', {
		provideCompletionItems(document, position) {
			const line = document.lineAt(position).text.substr(0, position.character);
			// Sugestão ao digitar <
			if (line.endsWith('<')) {
				return allCustomTags.map(tag => {
					const requiredAttrs = allowedTags[tag] || [];
					const optionalAttrs = optionalAttrsMap[tag] || [];
					let snippet = tag;
					let attrSnippets: string[] = [];
					// Se for a tag raiz, já inclui o namespace
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
					item.detail = 'Tag customizada do Confluence';
					item.documentation = [
						requiredAttrs.length > 0 ? `Atributos obrigatórios: ${requiredAttrs.join(', ')}` : undefined,
						optionalAttrs.length > 0 ? `Atributos opcionais: ${optionalAttrs.join(', ')}` : undefined,
						tag === 'csp:parameters' ? 'Inclui automaticamente o namespace obrigatório.' : undefined
					].filter(Boolean).join('\n');
					return item;
				});
			}
			// Sugestão de fechamento ao digitar </
			if (line.endsWith('</')) {
				return allCustomTags.map(tag => {
					const item = new vscode.CompletionItem(`/${tag}`, vscode.CompletionItemKind.Snippet);
					item.insertText = `${tag}>`;
					item.detail = 'Fechar tag customizada';
					return item;
				});
			}
			// Sugestão de atributos obrigatórios e opcionais ao abrir uma tag
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
						item.detail = requiredAttrs.includes(attr) ? 'Atributo obrigatório' : 'Atributo opcional';
						// Sugestão de valores permitidos para o atributo
						const allowedKey = `${tag}@${attr}`;
						if (allowedValues[allowedKey]) {
							item.documentation = 'Valores permitidos: ' + allowedValues[allowedKey].join(', ');
						}
						return item;
					});
				}
			}
			// Sugestão de valores permitidos ao digitar dentro de um atributo
			const attrValueMatch = line.match(/<([\w\-:]+)[^>]*\s([\w\-:]+)="[^"]*$/);
			if (attrValueMatch) {
				const tag = attrValueMatch[1];
				const attr = attrValueMatch[2];
				const allowedKey = `${tag}@${attr}`;
				if (allowedValues[allowedKey]) {
					return allowedValues[allowedKey].map((val: string) => {
						const item = new vscode.CompletionItem(val, vscode.CompletionItemKind.Value);
						item.insertText = val;
						item.detail = 'Valor permitido';
						return item;
					});
				}
			}
			return undefined;
		}
	}, '<', '/');

	// Comando para comparar arquivo local com publicado no Confluence
	const diffWithPublishedCmd = vscode.commands.registerCommand('confluence-smart-publisher.diffWithPublished', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage('Selecione um arquivo .confluence para comparar.');
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
			const input = await vscode.window.showInputBox({ prompt: 'Informe o ID da página do Confluence para comparar', ignoreFocusOut: true });
			if (!input) {
				vscode.window.showWarningMessage('ID da página não informado.');
				return;
			}
			fileId = input;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Baixando versão publicada do Confluence...',
				cancellable: false
			}, async () => {
				outputChannel.appendLine(`[Diff] Comparando arquivo local com publicado. fileId=${fileId}`);
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

				outputChannel.appendLine(`[Diff] Arquivos formatados prontos para diff.`);
				const leftUri = vscode.Uri.file(formattedLocalPath);
				const rightUri = vscode.Uri.file(formattedPublishedPath);
				const title = `Diff: Local (formatado) ↔ Publicado (formatado) (${fileId})`;
				await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
			});
		} catch (e: any) {
			outputChannel.appendLine(`[Diff] Erro ao comparar: ${e.message || e}`);
			outputChannel.show(true);
			vscode.window.showErrorMessage(`Erro ao comparar: ${e.message || e}`);
		}
	});

	// Comando para sincronizar arquivo local com o publicado no Confluence
	const syncWithPublishedCmd = vscode.commands.registerCommand('confluence-smart-publisher.syncWithPublished', async (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.endsWith('.confluence')) {
			vscode.window.showErrorMessage('Selecione um arquivo .confluence para sincronizar.');
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
			const input = await vscode.window.showInputBox({ prompt: 'Informe o ID da página do Confluence para sincronizar', ignoreFocusOut: true });
			if (!input) {
				vscode.window.showWarningMessage('ID da página não informado.');
				return;
			}
			fileId = input;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Baixando versão publicada do Confluence...',
				cancellable: false
			}, async () => {
				outputChannel.appendLine(`[Sync] Baixando versão publicada para sincronização. fileId=${fileId}`);
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

				outputChannel.appendLine(`[Sync] Exibindo diff para decisão do usuário.`);
				const leftUri = vscode.Uri.file(formattedLocalPath);
				const rightUri = vscode.Uri.file(formattedPublishedPath);
				const title = `Diff: Local (formatado) ↔ Publicado (formatado) (${fileId})`;
				await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);

				const escolha = await vscode.window.showQuickPick([
					{
						label: 'Atualizar arquivo local com o conteúdo online',
						detail: 'Sobrescreve o arquivo local com o conteúdo baixado do Confluence.'
					},
					{
						label: 'Atualizar o Confluence com o conteúdo local',
						detail: 'Publica o arquivo local no Confluence.'
					},
					{
						label: 'Cancelar',
						detail: 'Não faz nenhuma alteração.'
					}
				], { placeHolder: 'Escolha a ação de sincronização' });

				if (!escolha || escolha.label === 'Cancelar') {
					outputChannel.appendLine('[Sync] Sincronização cancelada pelo usuário.');
					return;
				}

				if (escolha.label === 'Atualizar arquivo local com o conteúdo online') {
					fs.writeFileSync(uri.fsPath, publishedContent, { encoding: 'utf-8' });
					outputChannel.appendLine('[Sync] Arquivo local atualizado com sucesso!');
					vscode.window.showInformationMessage('Arquivo local atualizado com sucesso!');
				} else if (escolha.label === 'Atualizar o Confluence com o conteúdo local') {
					await vscode.window.withProgress({
						location: vscode.ProgressLocation.Notification,
						title: 'Publicando conteúdo local no Confluence...',
						cancellable: false
					}, async () => {
						outputChannel.appendLine('[Sync] Publicando conteúdo local no Confluence...');
						await publishConfluenceFile(uri.fsPath);
						outputChannel.appendLine('[Sync] Conteúdo local publicado com sucesso!');
						vscode.window.showInformationMessage('Conteúdo local publicado no Confluence com sucesso!');
					});
				}
			});
		} catch (e: any) {
			outputChannel.appendLine(`[Sync] Erro ao sincronizar: ${e.message || e}`);
			outputChannel.show(true);
			vscode.window.showErrorMessage(`Erro ao sincronizar: ${e.message || e}`);
		}
	});

	context.subscriptions.push(publishCmd, getPageByTitleCmd, getPageByIdCmd, createPageCmd, confluenceFormatter, tagCompletionProvider, formatConfluenceCmd, diffWithPublishedCmd, syncWithPublishedCmd);
}

function validateConfluenceHTML(text: string): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];
	// Pilha para rastrear tags abertas
	const openTags: { tag: string, index: number, line: number, char: number }[] = [];
	// Regex para encontrar tags
	const tagRegex = /<\/?([\w:-]+)[^>]*?>/g;
	let match;
	// Para mapear índice para linha/coluna
	const lines = text.split(/\r?\n/);
	// Função para achar linha/coluna a partir do índice
	function getLineCol(index: number) {
		let total = 0;
		for (let i = 0; i < lines.length; i++) {
			if (index < total + lines[i].length + 1) {
				return { line: i, char: index - total };
			}
			total += lines[i].length + 1;
		}
		return { line: lines.length - 1, char: lines[lines.length - 1].length };
	}
	while ((match = tagRegex.exec(text)) !== null) {
		const [full, tag] = match;
		const isClosing = full.startsWith('</');
		const isSelfClosing = /\/$/.test(full);
		const pos = getLineCol(match.index);
		if (!isClosing && !isSelfClosing) {
			// Tag de abertura (não self-closing)
			openTags.push({ tag, index: match.index, line: pos.line, char: pos.char });
		} else if (isClosing) {
			// Tag de fechamento
			const lastOpenIdx = openTags.map(t => t.tag).lastIndexOf(tag);
			if (lastOpenIdx === -1) {
				// Não foi aberta antes
				diagnostics.push(new vscode.Diagnostic(
					new vscode.Range(pos.line, pos.char, pos.line, pos.char + full.length),
					`Tag de fechamento </${tag}> sem correspondente de abertura`,
					vscode.DiagnosticSeverity.Error
				));
			} else {
				// Remove da pilha até encontrar a correspondente
				openTags.splice(lastOpenIdx, 1);
			}
		}
	}
	// O que sobrou na pilha são tags não fechadas
	for (const open of openTags) {
		diagnostics.push(new vscode.Diagnostic(
			new vscode.Range(open.line, open.char, open.line, open.char + open.tag.length + 2),
			`Tag de abertura <${open.tag}> sem correspondente de fechamento`,
			vscode.DiagnosticSeverity.Error
		));
	}

	// --- Validações de estrutura, atributos obrigatórios e hierarquia ---
	let $: ReturnType<typeof cheerio.load>;
	try {
		$ = cheerio.load(text, { xmlMode: false });
	} catch (e: any) {
		diagnostics.push(new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 1),
			'Erro ao analisar HTML: ' + e.message,
			vscode.DiagnosticSeverity.Error
		));
		return diagnostics;
	}

	// Validação de tags customizadas, atributos obrigatórios e hierarquia
	function checkTagsCheerio(selector: string, parentSelector?: string) {
		$(selector).each((_: number, el: any) => {
			const tag = el.tagName;
			// Posição da tag no texto
			const html = $.html(el);
			const idx = text.indexOf('<' + tag);
			const pos = getLineCol(idx >= 0 ? idx : 0);
			if (!(tag in allowedTags)) {
				diagnostics.push(new vscode.Diagnostic(
					new vscode.Range(pos.line, pos.char, pos.line, pos.char + tag.length + 2),
					`Tag não permitida: <${tag}>`,
					vscode.DiagnosticSeverity.Error
				));
			} else {
				const requiredAttrs = allowedTags[tag];
				for (const attr of requiredAttrs) {
					if (!$(el).attr(attr)) {
						diagnostics.push(new vscode.Diagnostic(
							new vscode.Range(pos.line, pos.char, pos.line, pos.char + tag.length + 2),
							`Atributo obrigatório '${attr}' ausente em <${tag}>`,
							vscode.DiagnosticSeverity.Error
						));
					}
				}
				// Hierarquia
				if (tag in allowedHierarchy && parentSelector) {
					const parent = $(el).parent()[0];
					if (parent && !allowedHierarchy[tag].includes(parent.tagName)) {
						diagnostics.push(new vscode.Diagnostic(
							new vscode.Range(pos.line, pos.char, pos.line, pos.char + tag.length + 2),
							`<${tag}> deve estar dentro de ${allowedHierarchy[tag].map(p => `<${p}>`).join(' ou ')}`,
							vscode.DiagnosticSeverity.Error
						));
					}
				}
			}
		});
	}

	// Checa todas as tags customizadas
	Object.keys(allowedTags).forEach(tag => {
		if (tag.includes(':')) {
			checkTagsCheerio(tag);
		}
	});

	// Validação de estrutura obrigatória CSP
	const csp = $('csp:parameters');
	if (csp.length === 0) {
		diagnostics.push(new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 1),
			'Tag <csp:parameters> obrigatória no documento.',
			vscode.DiagnosticSeverity.Error
		));
	} else {
		const cspEl = csp[0];
		if (!$(cspEl).attr('xmlns:csp')) {
			diagnostics.push(new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 1),
				'Atributo xmlns:csp obrigatório em <csp:parameters>. Exemplo: <csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">',
				vscode.DiagnosticSeverity.Error
			));
		}
		if ($(cspEl).find('csp:file_id').length === 0) {
			diagnostics.push(new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 1),
				'Tag <csp:file_id> obrigatória dentro de <csp:parameters>.',
				vscode.DiagnosticSeverity.Error
			));
		}
		if ($(cspEl).find('csp:labels_list').length === 0) {
			diagnostics.push(new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 1),
				'Tag <csp:labels_list> obrigatória dentro de <csp:parameters>.',
				vscode.DiagnosticSeverity.Error
			));
		}
		if ($(cspEl).find('csp:parent_id').length === 0) {
			diagnostics.push(new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 1),
				'Tag <csp:parent_id> obrigatória dentro de <csp:parameters>.',
				vscode.DiagnosticSeverity.Error
			));
		}
		if ($(cspEl).find('csp:properties').length === 0) {
			diagnostics.push(new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 1),
				'Tag <csp:properties> obrigatória dentro de <csp:parameters>.',
				vscode.DiagnosticSeverity.Error
			));
		} else {
			const props = $(cspEl).find('csp:properties');
			props.each((_: number, propEl: any) => {
				const keys = $(propEl).find('csp:key');
				const values = $(propEl).find('csp:value');
				if (keys.length !== values.length) {
					diagnostics.push(new vscode.Diagnostic(
						new vscode.Range(0, 0, 0, 1),
						'A quantidade de <csp:key> e <csp:value> em <csp:properties> deve ser igual.',
						vscode.DiagnosticSeverity.Error
					));
				}
			});
		}
	}

	// Validação específica para ac:layout como root
	const acLayout = $('ac:layout');
	if (acLayout.length > 0) {
		acLayout.each((_: number, layoutEl: any) => {
			if (!$(layoutEl).attr('version')) {
				diagnostics.push(new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 1),
					'<ac:layout> deve conter o atributo obrigatório \'version\'.',
					vscode.DiagnosticSeverity.Error
				));
			}
			if (!$(layoutEl).attr('type')) {
				diagnostics.push(new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 1),
					'<ac:layout> deve conter o atributo obrigatório \'type\'.',
					vscode.DiagnosticSeverity.Error
				));
			}
			const sections = $(layoutEl).find('ac:layout-section');
			if (sections.length === 0) {
				diagnostics.push(new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 1),
					'<ac:layout> deve conter pelo menos um <ac:layout-section> como filho.',
					vscode.DiagnosticSeverity.Error
				));
			} else {
				sections.each((idx: number, sectionEl: any) => {
					if (!$(sectionEl).attr('type')) {
						diagnostics.push(new vscode.Diagnostic(
							new vscode.Range(0, 0, 0, 1),
							`<ac:layout-section> (posição ${idx + 1}) deve conter o atributo obrigatório 'type'.`,
							vscode.DiagnosticSeverity.Error
						));
					}
					const cells = $(sectionEl).find('ac:layout-cell');
					if (cells.length === 0) {
						diagnostics.push(new vscode.Diagnostic(
							new vscode.Range(0, 0, 0, 1),
							`<ac:layout-section> (posição ${idx + 1}) deve conter pelo menos um <ac:layout-cell> como filho.`,
							vscode.DiagnosticSeverity.Error
						));
					} else {
						cells.each((cidx: number, cellEl: any) => {
							if (!$(cellEl).attr('id')) {
								diagnostics.push(new vscode.Diagnostic(
									new vscode.Range(0, 0, 0, 1),
									`<ac:layout-cell> (posição ${cidx + 1} da seção ${idx + 1}) deve conter o atributo obrigatório 'id'.`,
									vscode.DiagnosticSeverity.Error
								));
							}
							if (!$(cellEl).attr('style')) {
								diagnostics.push(new vscode.Diagnostic(
									new vscode.Range(0, 0, 0, 1),
									`<ac:layout-cell> (posição ${cidx + 1} da seção ${idx + 1}) deve conter o atributo obrigatório 'style'.`,
									vscode.DiagnosticSeverity.Error
								));
							}
						});
					}
				});
			}
		});
	}

	return diagnostics;
}

// This method is called when your extension is deactivated
export function deactivate() {}
