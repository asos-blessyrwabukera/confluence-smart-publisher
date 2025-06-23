import TurndownService from 'turndown';
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

        // Regra para tabelas HTML
        this.turndownService.addRule('confluenceTable', {
            filter: (node) => node.nodeName === 'TABLE',
            replacement: (content, node) => {
                const table = node as HTMLElement;
                let markdown = '';
                const rows = Array.from(table.getElementsByTagName('tr'));
                if (rows.length === 0) {return '';}
                // Detecta se é tabela de propriedades: todas as linhas têm 1 <th> e 1 <td>
                const isPropertyTable = rows.every(row => {
                    const ths = row.getElementsByTagName('th');
                    const tds = row.getElementsByTagName('td');
                    return ths.length === 1 && tds.length === 1;
                });
                if (isPropertyTable) {
                    markdown += '\n'; // Linha em branco antes da tabela
                    rows.forEach((row, idx) => {
                        const th = row.getElementsByTagName('th')[0];
                        const td = row.getElementsByTagName('td')[0];
                        const key = th ? th.textContent?.replace(/\n/g, ' ').trim() : '';
                        const value = td ? td.textContent?.replace(/\n/g, ' ').trim() : '';
                        if (key || value) {
                            markdown += `**${key}:** ${value}\n\n`;
                        }
                    });
                    return markdown;
                }
                // Caso contrário, trata como tabela tradicional
                const headers = Array.from(rows[0].getElementsByTagName('th'));
                if (headers.length > 0) {
                    markdown += '| ' + headers.map(h => h.textContent?.trim() || '').join(' | ') + ' |\n';
                    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                }
                rows.forEach((row, idx) => {
                    if (headers.length > 0 && idx === 0) {return;}
                    const cells = Array.from(row.getElementsByTagName('td'));
                    if (cells.length > 0) {
                        markdown += '| ' + cells.map(c => c.textContent?.trim() || '').join(' | ') + ' |\n';
                    }
                });
                return '\n' + markdown + '\n';
            }
        });

        // (Re)adiciona a regra customizada para parágrafos <p> (case-insensitive, registrada por último)
        this.turndownService.addRule('customParagraph', {
            filter: (node) => node.nodeName.toLowerCase() === 'p',
            replacement: (content, node) => {
                const trimmedContent = content.trim();
                // Se o parágrafo está vazio ou auto-fechado
                if (!trimmedContent) {
                    return '\n';
                }
                // Parágrafo com conteúdo
                return `\n${trimmedContent}\n`;
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

        // Pré-processa todas as macros de status, mesmo aninhadas
        $('ac\\:structured-macro[ac\\:name="status"]').each((i, el) => {
            const $el = $(el);
            const title = $el.find('ac\\:parameter[ac\\:name="title"]').text() || '';
            const colour = $el.find('ac\\:parameter[ac\\:name="colour"]').text() || '';
            // Capitaliza o título
            const capTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
            const colorMap: Record<string, string> = {
                'blue': '🔵',
                'green': '🟢',
                'yellow': '🟡',
                'red': '🔴',
                'purple': '🟣',
            };
            const emoji = colorMap[colour?.toLowerCase?.()] || '⚪';
            // Garante sempre uma linha em branco antes
            $el.replaceWith(`<p>${capTitle} ${emoji}</p>`);
        });

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

        // --- AJUSTE DE ESTRUTURA: Remove <p> aninhados e <p> vazios ---
        // Move <p> internos para fora do pai
        $('p p').each(function (this: cheerio.Element) {
            $(this).parent().after($(this));
        });
        // Remove <p> que ficou vazio após mover os filhos
        $('p').each(function (this: cheerio.Element) {
            if ($(this).text().trim() === '') {
                $(this).remove();
            }
        });

        // Remove wrappers <ac:rich-text-body>, mantendo apenas o conteúdo interno
        $('ac\\:rich-text-body').each(function (this: cheerio.Element) {
            const html = $(this).html();
            if (html !== null) {
                $(this).replaceWith(html);
            } else {
                $(this).remove();
            }
        });

        // Obtém o HTML processado
        const processedHtml = $.html() || '';
        this.outputChannel.appendLine(`[Convert] Tamanho do HTML processado: ${processedHtml.length} caracteres`);
        this.outputChannel.appendLine(`${processedHtml}`);
        this.outputChannel.appendLine(`[Convert] Fim do HTML processado`);


        if (!processedHtml) {
            throw new Error('Não foi possível processar o conteúdo HTML.');
        }

        // Converte para Markdown
        let markdown = this.turndownService.turndown('<body>' + processedHtml + '</body>');
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
                    if (!isFirstH1) {tocMarkdown += '\n';}
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