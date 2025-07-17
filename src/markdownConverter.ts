import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { marked, MarkedOptions } from 'marked';
import { createXMLCSPBlock, createDefaultCSPProperties } from './csp-utils';

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
            const confluenceContent = await this.convertHtmlToConfluence(htmlContent);
            
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
    private async convertHtmlToConfluence(htmlContent: string): Promise<string> {
        // Adiciona a estrutura csp:parameters no início do documento usando a função utilitária
        const cspMetadata = {
            file_id: '',
            parent_id: '',
            labels_list: '',
            properties: createDefaultCSPProperties()
        };
        const cspParameters = createXMLCSPBlock(cspMetadata);

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