import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { marked, MarkedOptions } from 'marked';
import xmlEscape from 'xml-escape';

export class MarkdownConverter {
    private static instance: MarkdownConverter;

    private constructor() {
        // Initial marked configuration
        const options: MarkedOptions = {
            gfm: true, // GitHub Flavored Markdown
            breaks: true
        };
        marked.setOptions(options);
    }

    public static getInstance(): MarkdownConverter {
        if (!MarkdownConverter.instance) {
            MarkdownConverter.instance = new MarkdownConverter();
        }
        return MarkdownConverter.instance;
    }

    /**
     * Converts a Markdown file to Confluence Storage Format
     * @param markdownFilePath Path to the Markdown file
     * @returns Promise with the path of the converted file
     */
    public async convertFile(markdownFilePath: string): Promise<string> {
        try {
            // Read the Markdown file content
            const markdownContent = await fs.readFile(markdownFilePath, 'utf8');
            
            // Convert content to HTML using marked
            const htmlContent = marked.parse(markdownContent) as string;
            
            // Convert HTML to Confluence Storage Format
            const confluenceContent = this.convertHtmlToConfluence(htmlContent);
            
            // Generate the new file path
            const confluenceFilePath = this.generateConfluenceFilePath(markdownFilePath);
            
            // Save the converted file
            await fs.writeFile(confluenceFilePath, confluenceContent, 'utf8');
            
            return confluenceFilePath;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Error converting file: ${errorMessage}`);
        }
    }

    /**
     * Converts HTML to Confluence Storage Format
     * @param htmlContent HTML content
     * @returns Content in Confluence Storage Format
     */
    private convertHtmlToConfluence(htmlContent: string): string {
        // Adiciona a estrutura csp:parameters no início do documento
        const cspParameters = `<csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">
    <csp:file_id></csp:file_id>
    <csp:parent_id></csp:parent_id>
    <csp:labels_list></csp:labels_list>
    <csp:properties>
        <csp:key>content-appearance-published</csp:key>
        <csp:value>fixed-width</csp:value>
        <csp:key>content-appearance-draft</csp:key>
        <csp:value>fixed-width</csp:value>
    </csp:properties>
</csp:parameters>`;

        // Retorna o conteúdo formatado sem o cabeçalho XML e sem o macro info
        return `${cspParameters}\n\n${htmlContent}`;
    }

    /**
     * Generates the Confluence file path based on the Markdown file path
     * @param markdownFilePath Path to the Markdown file
     * @returns Path to the Confluence file
     */
    private generateConfluenceFilePath(markdownFilePath: string): string {
        const dirName = path.dirname(markdownFilePath);
        const baseName = path.basename(markdownFilePath, '.md');
        return path.join(dirName, `${baseName}.confluence`);
    }
} 