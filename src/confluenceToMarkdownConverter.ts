import * as vscode from 'vscode';
import { decodeHtmlEntities } from './confluenceFormatter';
import * as yaml from 'yaml';

interface ConfluenceMetadata {
    file_id: string;
    labels: string[];
    version: string;
    status: string;
    lastModified: Date;
    properties: Record<string, string>;
}

export class ConfluenceToMarkdownConverter {
    private metadata: ConfluenceMetadata;
    private content: string;

    constructor(confluenceContent: string) {
        this.content = confluenceContent;
        this.metadata = this.extractMetadata();
    }

    private extractMetadata(): ConfluenceMetadata {
        const fileIdMatch = this.content.match(/<csp:file_id>(.*?)<\/csp:file_id>/);
        const labelsMatch = this.content.match(/<csp:labels_list>(.*?)<\/csp:labels_list>/);
        const propertiesMatch = this.content.match(/<csp:properties>(.*?)<\/csp:properties>/s);

        const properties: Record<string, string> = {};
        if (propertiesMatch) {
            const keyValuePairs = propertiesMatch[1].match(/<csp:key>(.*?)<\/csp:key>\s*<csp:value>(.*?)<\/csp:value>/g);
            if (keyValuePairs) {
                keyValuePairs.forEach(pair => {
                    const keyMatch = pair.match(/<csp:key>(.*?)<\/csp:key>/);
                    const valueMatch = pair.match(/<csp:value>(.*?)<\/csp:value>/);
                    if (keyMatch && valueMatch) {
                        properties[keyMatch[1]] = valueMatch[1];
                    }
                });
            }
        }

        return {
            file_id: fileIdMatch ? fileIdMatch[1] : '',
            labels: labelsMatch ? labelsMatch[1].split(',').map(label => label.trim()) : [],
            version: properties['version'] || '1.0',
            status: properties['status'] || 'current',
            lastModified: new Date(),
            properties: properties
        };
    }

    private convertTitles(): string {
        let content = this.content;
        const titleMapping = {
            'h1': '#',
            'h2': '##',
            'h3': '###',
            'h4': '####',
            'h5': '#####',
            'h6': '######'
        };

        Object.entries(titleMapping).forEach(([htmlTag, markdownTag]) => {
            const regex = new RegExp(`<${htmlTag}[^>]*>(.*?)</${htmlTag}>`, 'g');
            content = content.replace(regex, (match, title) => `${markdownTag} ${decodeHtmlEntities(title)}`);
        });

        return content;
    }

    private convertTables(): string {
        let content = this.content;
        const tableRegex = /<table[^>]*>(.*?)<\/table>/gs;
        
        content = content.replace(tableRegex, (match: string, tableContent: string) => {
            const rows = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gs) || [];
            let markdownTable = '';
            
            rows.forEach((row: string, index: number) => {
                const cells = row.match(/<(?:th|td)[^>]*>(.*?)<\/(?:th|td)>/gs) || [];
                const rowContent = cells.map((cell: string) => {
                    const cellContent = cell.replace(/<(?:th|td)[^>]*>(.*?)<\/(?:th|td)>/s, '$1');
                    return `| ${decodeHtmlEntities(cellContent.trim())} `;
                }).join('') + '|';
                
                markdownTable += rowContent + '\n';
                
                if (index === 0) {
                    markdownTable += cells.map(() => '| --- ').join('') + '|\n';
                }
            });
            
            return markdownTable;
        });

        return content;
    }

    private convertLists(): string {
        let content = this.content;
        
        // Remove csp:parameters e outros elementos não relacionados ao conteúdo
        content = content.replace(/<csp:parameters[^>]*>.*?<\/csp:parameters>/s, '');
        
        // Converte listas ordenadas
        content = content.replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match: string, listContent: string) => {
            const items = listContent.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
            return items.map((item: string, index: number) => {
                const itemContent = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1');
                return `${index + 1}. ${decodeHtmlEntities(itemContent.trim())}`;
            }).join('\n');
        });

        // Converte listas não ordenadas
        content = content.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match: string, listContent: string) => {
            const items = listContent.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
            return items.map((item: string) => {
                const itemContent = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1');
                return `- ${decodeHtmlEntities(itemContent.trim())}`;
            }).join('\n');
        });

        return content;
    }

    private convertCodeBlocks(): string {
        let content = this.content;
        const codeBlockRegex = /<ac:structured-macro[^>]*ac:name="code"[^>]*>(.*?)<\/ac:structured-macro>/gs;
        
        content = content.replace(codeBlockRegex, (match, macroContent) => {
            const languageMatch = macroContent.match(/<ac:parameter[^>]*ac:name="language"[^>]*>(.*?)<\/ac:parameter>/);
            const codeMatch = macroContent.match(/<ac:plain-text-body[^>]*>(.*?)<\/ac:plain-text-body>/);
            
            if (codeMatch) {
                const language = languageMatch ? languageMatch[1] : '';
                const code = decodeHtmlEntities(codeMatch[1]);
                return `\`\`\`${language}\n${code}\n\`\`\``;
            }
            
            return match;
        });

        return content;
    }

    private convertQuotesAndNotes(): string {
        let content = this.content;
        
        const macroIconMap = {
            'info': 'ℹ️',
            'tip': '💡',
            'note': '📝',
            'warning': '⚠️',
            'error': '⛔'
        };

        // Converte todos os tipos de blocos de nota
        Object.entries(macroIconMap).forEach(([macroName, icon]) => {
            const regex = new RegExp(`<ac:structured-macro[^>]*ac:name="${macroName}"[^>]*>(.*?)</ac:structured-macro>`, 'gs');
            content = content.replace(regex, (match: string, noteContent: string) => {
                const titleMatch = noteContent.match(/<ac:parameter[^>]*ac:name="title"[^>]*>(.*?)<\/ac:parameter>/);
                const contentMatch = noteContent.match(/<ac:rich-text-body[^>]*>(.*?)<\/ac:rich-text-body>/);
                
                if (contentMatch) {
                    const title = titleMatch ? titleMatch[1] : macroName.charAt(0).toUpperCase() + macroName.slice(1);
                    const noteText = decodeHtmlEntities(contentMatch[1]);
                    return `> ${icon} **${title}**: ${noteText}`;
                }
                
                return match;
            });
        });

        return content;
    }

    private convertExpandableBlocks(): string {
        let content = this.content;
        const expandRegex = /<ac:structured-macro[^>]*ac:name="expand"[^>]*>(.*?)<\/ac:structured-macro>/gs;
        
        content = content.replace(expandRegex, (match, expandContent) => {
            const titleMatch = expandContent.match(/<ac:parameter[^>]*ac:name="title"[^>]*>(.*?)<\/ac:parameter>/);
            const contentMatch = expandContent.match(/<ac:rich-text-body[^>]*>(.*?)<\/ac:rich-text-body>/);
            
            if (contentMatch) {
                const title = titleMatch ? titleMatch[1] : 'Expandir';
                const expandText = decodeHtmlEntities(contentMatch[1]);
                return `<details>\n<summary>${title}</summary>\n\n${expandText}\n</details>`;
            }
            
            return match;
        });

        return content;
    }

    private convertLinks(): string {
        let content = this.content;
        
        // Converte links internos
        content = content.replace(/<ac:link[^>]*>(.*?)<\/ac:link>/gs, (match, linkContent) => {
            const pageMatch = linkContent.match(/<ri:page[^>]*ri:content-title="([^"]*)"[^>]*>/);
            const textMatch = linkContent.match(/<ac:link-body>(.*?)<\/ac:link-body>/);
            
            if (pageMatch && textMatch) {
                const pageTitle = pageMatch[1];
                const linkText = textMatch[1];
                const anchor = pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return `[${decodeHtmlEntities(linkText)}](#${anchor})`;
            }
            
            return match;
        });

        // Converte links externos
        content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs, (match, url, text) => {
            return `[${decodeHtmlEntities(text)}](${url})`;
        });

        return content;
    }

    public convert(): string {
        // Extrai metadados e cria o cabeçalho YAML
        const yamlHeader = yaml.stringify(this.metadata);
        
        // Aplica as conversões
        let markdownContent = this.content;
        markdownContent = this.convertTitles();
        markdownContent = this.convertTables();
        markdownContent = this.convertLists();
        markdownContent = this.convertCodeBlocks();
        markdownContent = this.convertQuotesAndNotes();
        markdownContent = this.convertExpandableBlocks();
        markdownContent = this.convertLinks();
        
        // Remove tags HTML restantes
        markdownContent = markdownContent.replace(/<[^>]+>/g, '');
        
        // Decodifica entidades HTML
        markdownContent = decodeHtmlEntities(markdownContent);
        
        // Combina o cabeçalho YAML com o conteúdo
        return `---\n${yamlHeader}---\n\n${markdownContent}`;
    }
} 