import TurndownService from 'turndown';
import * as cheerio from 'cheerio';
import * as vscode from 'vscode';

/**
 * Classe responsável por converter conteúdo do Confluence para Markdown
 */
export class ConfluenceToMarkdownConverter {
    private turndownService: TurndownService;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
        });

        this.setupCustomRules();
    }

    /**
     * Configura as regras customizadas para conversão de macros do Confluence
     */
    private setupCustomRules(): void {
        // Regra para a macro <ac:structured-macro ac:name="expand">
        this.turndownService.addRule('confluenceExpand', {
            filter: (node) => {
                return node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === 'expand';
            },
            replacement: (content, node) => {
                const macroNode = node as HTMLElement;
                // Captura o valor do título ANTES de remover o parâmetro
                const titleNode = Array.from(macroNode.getElementsByTagName('ac:parameter')).find(p => p.getAttribute('ac:name') === 'title');
                const title = titleNode?.textContent || 'Details';
                // Remove o parâmetro de título do conteúdo expandido
                if (titleNode) {
                    titleNode.parentNode?.removeChild(titleNode);
                }
                // Re-obter o conteúdo sem o parâmetro de título
                let innerContent = '';
                const richTextBody = macroNode.querySelector('ac\\:rich-text-body');
                if (richTextBody) {
                    innerContent = richTextBody.innerHTML || '';
                } else {
                    innerContent = content;
                }
                return `\n<details>\n<summary>${title}</summary>\n\n${innerContent}\n</details>\n`;
            }
        });

        // Regra para as macros de callout/painel (note, tip, info, warning, error)
        const panelMacros = ['note', 'tip', 'info', 'warning', 'error'];
        panelMacros.forEach(macroName => {
            this.turndownService.addRule(`confluencePanel_${macroName}`, {
                filter: (node) => {
                    return (node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === macroName) ||
                           (node.nodeName === 'AC:ADF-NODE' && node.getAttribute('type') === 'panel');
                },
                replacement: (content) => {
                    return `\n> ${content.split('\n').join('\n> ')}\n\n`;
                }
            });
        });

        // Regra para a macro <ac:structured-macro ac:name="code">
        this.turndownService.addRule('confluenceCodeMacro', {
            filter: (node) => {
                return node.nodeName === 'AC:STRUCTURED-MACRO' && 
                       node.getAttribute('ac:name') === 'code';
            },
            replacement: (content, node) => {
                const macroNode = node as HTMLElement;
                const languageNode = Array.from(macroNode.getElementsByTagName('ac:parameter')).find(p => p.getAttribute('ac:name') === 'language');
                const language = languageNode?.textContent || '';
                const codeBody = macroNode.querySelector('ac\\:plain-text-body')?.textContent?.trim() || '';
                return `\`\`\`${language}\n${codeBody}\n\`\`\`\n\n`;
            }
        });

        // Regra para a macro <ac:structured-macro ac:name="status">
        this.turndownService.addRule('confluenceStatus', {
            filter: (node) => {
              return node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === 'status';
            },
            replacement: (content, node) => {
                const macroNode = node as HTMLElement;
                const titleNode = Array.from(macroNode.getElementsByTagName('ac:parameter')).find(p => p.getAttribute('ac:name') === 'title');
                const title = titleNode?.textContent || '';
                return `**${title}**`;
            }
        });
        
        // Regra para a macro de fórmula matemática
        this.turndownService.addRule('confluenceMath', {
            filter: (node) => {
                return node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === 'easy-math-block';
            },
            replacement: (content, node) => {
                const macroNode = node as HTMLElement;
                const bodyNode = Array.from(macroNode.getElementsByTagName('ac:parameter')).find(p => p.getAttribute('ac:name') === 'body');
                const latex = bodyNode?.textContent || '';
                return `\n$$\n${latex}\n$$\n`;
            }
        });

        // Regra para task lists
        this.turndownService.addRule('confluenceTaskList', {
            filter: (node) => node.nodeName.toLowerCase() === 'ac:task-list',
            replacement: (content) => {
                return content;
            }
        });
        this.turndownService.addRule('confluenceTask', {
            filter: (node) => node.nodeName.toLowerCase() === 'ac:task',
            replacement: (content, node) => {
                const taskNode = node as HTMLElement;
                const statusNode = taskNode.querySelector('ac\\:task-status');
                const status = statusNode?.textContent || '';
                const checkbox = (status === 'complete') ? '- [x]' : '- [ ]';
                const bodyNode = taskNode.querySelector('ac\\:task-body');
                const taskText = bodyNode?.textContent?.trim() || '';
                return `${checkbox} ${taskText}\n`;
            }
        });

        // Regra para emoticons
        this.turndownService.addRule('confluenceEmoticon', {
            filter: (node) => node.nodeName.toLowerCase() === 'ac:emoticon',
            replacement: (content, node) => {
                return (node as HTMLElement).getAttribute('ac:emoji-fallback') || '';
            }
        });
    }

    /**
     * Converte conteúdo do Confluence para Markdown
     * @param confluenceContent - Conteúdo no formato Confluence Storage
     * @returns Conteúdo convertido para Markdown
     */
    public convert(confluenceContent: string): string {
        this.outputChannel.appendLine('[Convert] Iniciando conversão...');

        if (!confluenceContent.trim()) {
            throw new Error('O conteúdo do Confluence está vazio.');
        }

        // Carrega o conteúdo no Cheerio para manipulação
        const $ = cheerio.load(confluenceContent, {
            xmlMode: true,
            decodeEntities: false
        });

        this.outputChannel.appendLine('[Convert] Conteúdo carregado no Cheerio');

        // Remove o bloco de parâmetros CSP que não é parte do conteúdo
        $('csp\\:parameters').remove();

        // Converte <time> para seu texto
        $('time').each((i, el) => {
            const dateTime = $(el).attr('datetime');
            $(el).replaceWith(dateTime || '');
        });
        
        // Trata links do Jira que são exibidos como cards
        $('a[data-card-appearance="block"]').each((i, el) => {
            const href = $(el).attr('href');
            // Converte para um link Markdown padrão
            if(href) {
                $(el).replaceWith(`[${href}](${href})`);
            }
        });

        // Processa links do Confluence
        $('ac\\:link').each((index, element) => {
            const pageElement = $(element).find('ri\\:page');
            const title = pageElement.attr('ri:content-title');
            if (title) {
                const newLink = `[${title}](./${title.replace(/ /g, '-')}.md)`;
                $(element).replaceWith(newLink);
            }
        });

        // Obtém o HTML processado
        const processedHtml = $.html() || '';
        this.outputChannel.appendLine(`[Convert] Tamanho do HTML processado: ${processedHtml.length} caracteres`);

        if (!processedHtml) {
            throw new Error('Não foi possível processar o conteúdo HTML.');
        }

        // Converte para Markdown
        let markdown = this.turndownService.turndown(processedHtml);
        this.outputChannel.appendLine(`[Convert] Tamanho do Markdown gerado: ${markdown.length} caracteres`);

        // Gera o TOC após a conversão para Markdown
        const tocRegex = /^ac:structured-macro\[ac:name="toc"\]$/m;
        if (markdown.includes('<ac:structured-macro ac:name="toc"')) {
            // Busca todos os títulos Markdown
            const headingRegex = /^(#{1,6})\s+(.+)$/gm;
            const headings: {text: string, slug: string, level: number}[] = [];
            let match;
            let idx = 0;
            while ((match = headingRegex.exec(markdown)) !== null) {
                const level = match[1].length;
                const text = match[2].trim();
                const slug = `${++idx}-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u00C0-\u017F-]+/g, '')}`;
                headings.push({ text, slug, level });
            }
            // Gera o TOC em Markdown
            let tocMarkdown = '';
            let isFirstH1 = true;
            headings.forEach(h => {
                if (h.level === 1) {
                    if (!isFirstH1) tocMarkdown += '\n';
                    isFirstH1 = false;
                }
                const indent = '  '.repeat(h.level - 1);
                tocMarkdown += `${indent}- [${h.text}](#${h.slug})\n`;
            });
            // Substitui a macro TOC pelo TOC gerado
            markdown = markdown.replace(/<ac:structured-macro ac:name="toc"[\s\S]*?<\/ac:structured-macro>/, tocMarkdown.trim());
            this.outputChannel.appendLine(`[Convert] Índice Markdown gerado com ${headings.length} itens.`);
        }

        // Verifica se o resultado está vazio
        if (!markdown.trim()) {
            throw new Error('A conversão resultou em um arquivo vazio. Verifique se o arquivo de origem contém conteúdo válido.');
        }

        return markdown;
    }

    /**
     * Converte um arquivo do Confluence para Markdown
     * @param filePath - Caminho do arquivo .confluence
     * @returns Caminho do arquivo Markdown gerado
     */
    public async convertFile(filePath: string): Promise<string> {
        const fs = await import('fs');
        const path = await import('path');

        // Lê o conteúdo do arquivo
        const content = fs.readFileSync(filePath, 'utf-8');
        this.outputChannel.appendLine(`[Convert] Arquivo lido: ${content.length} caracteres`);

        // Verifica se o arquivo está vazio
        if (!content.trim()) {
            throw new Error('O arquivo de origem está vazio.');
        }

        // Converte o conteúdo
        const markdown = this.convert(content);

        // Gera o caminho do arquivo de saída
        const outputPath = filePath.replace('.confluence', '.md');

        // Salva o arquivo Markdown
        fs.writeFileSync(outputPath, markdown, 'utf-8');
        this.outputChannel.appendLine(`[Convert] Arquivo Markdown salvo em: ${outputPath}`);

        return outputPath;
    }
} 