import MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import * as path from 'path';

// Import markdown-it-admonition plugin
const markdownItAdmonition = require('markdown-it-admonition');

/**
 * MarkdownRenderer class responsible for converting Markdown content
 * to HTML with Material for MkDocs styling and admonition support
 */
export class MarkdownRenderer {
    private md: MarkdownIt;
    private extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this.md = new MarkdownIt({
            html: true,
            xhtmlOut: false,
            breaks: false,
            linkify: true,
            typographer: true,
            quotes: '""\'\'',
            highlight: this.highlightCode.bind(this)
        });

        // Configure admonitions plugin
        this.md.use(markdownItAdmonition, {
            markers: ['!!!'],
            types: {
                'note': {
                    keyword: 'note',
                    title: 'Note',
                    icon: '🛈'
                },
                'tip': {
                    keyword: 'tip', 
                    title: 'Tip',
                    icon: '💡'
                },
                'warning': {
                    keyword: 'warning',
                    title: 'Warning', 
                    icon: '⚠️'
                },
                'danger': {
                    keyword: 'danger',
                    title: 'Danger',
                    icon: '🚨'
                },
                'success': {
                    keyword: 'success',
                    title: 'Success',
                    icon: '✅'
                },
                'info': {
                    keyword: 'info',
                    title: 'Info',
                    icon: 'ℹ️'
                },
                'question': {
                    keyword: 'question',
                    title: 'Question',
                    icon: '❓'
                },
                'quote': {
                    keyword: 'quote',
                    title: 'Quote',
                    icon: '💬'
                }
            }
        });
    }

    /**
     * Renders markdown content to HTML with Material for MkDocs styling
     * @param content Markdown content to render
     * @param documentUri URI of the document being rendered (for relative paths)
     * @returns HTML string with embedded CSS
     */
    public renderToHtml(content: string, documentUri?: vscode.Uri): string {
        const htmlContent = this.md.render(content);
        const cssContent = this.getMaterialCss();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Preview</title>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <div class="md-content">
        <article class="md-content__inner md-typeset">
            ${htmlContent}
        </article>
    </div>
</body>
</html>`;
    }

    /**
     * Renders only the HTML content without wrapper
     * @param content Markdown content to render
     * @returns HTML string
     */
    public renderContent(content: string): string {
        return this.md.render(content);
    }

    /**
     * Syntax highlighting for code blocks
     * @param str Code content
     * @param lang Language identifier
     * @returns Highlighted HTML
     */
    private highlightCode(str: string, lang: string): string {
        if (lang && lang.trim()) {
            try {
                // Basic syntax highlighting classes for common languages
                const languageClass = `language-${lang.trim()}`;
                return `<pre class="highlight"><code class="${languageClass}">${this.escapeHtml(str)}</code></pre>`;
            } catch (err) {
                // Fallback to plain text
                return `<pre class="highlight"><code>${this.escapeHtml(str)}</code></pre>`;
            }
        }
        return `<pre class="highlight"><code>${this.escapeHtml(str)}</code></pre>`;
    }

    /**
     * Escapes HTML entities in text
     * @param text Text to escape
     * @returns Escaped text
     */
    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Returns Material for MkDocs CSS styles
     * This should be replaced with actual Material for MkDocs CSS
     * @returns CSS string
     */
    private getMaterialCss(): string {
        return `
/* Material for MkDocs Base Styles */
:root {
    --md-primary-fg-color: #1976d2;
    --md-primary-fg-color--light: #64b5f6;
    --md-primary-fg-color--dark: #0d47a1;
    --md-accent-fg-color: #ff5722;
    --md-default-bg-color: #ffffff;
    --md-default-fg-color: #000000;
    --md-default-fg-color--light: #8a8a8a;
    --md-default-fg-color--lighter: #b3b3b3;
    --md-default-fg-color--lightest: #cccccc;
    --md-code-bg-color: #f5f5f5;
    --md-code-fg-color: #37474f;
    --md-admonition-note-color: #448aff;
    --md-admonition-tip-color: #00c853;
    --md-admonition-warning-color: #ff9100;
    --md-admonition-danger-color: #ff5252;
    --md-admonition-success-color: #00e676;
    --md-admonition-info-color: #00b8d4;
    --md-admonition-question-color: #9c27b0;
    --md-admonition-quote-color: #9e9e9e;
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: var(--md-default-fg-color);
    background-color: var(--md-default-bg-color);
    margin: 0;
    padding: 20px;
}

.md-content {
    max-width: 1200px;
    margin: 0 auto;
}

.md-content__inner {
    padding: 0 16px;
}

.md-typeset {
    font-size: 16px;
    line-height: 1.6;
    color: var(--md-default-fg-color);
}

/* Headings */
.md-typeset h1,
.md-typeset h2,
.md-typeset h3,
.md-typeset h4,
.md-typeset h5,
.md-typeset h6 {
    margin: 1.25em 0 0.5em;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: var(--md-default-fg-color);
}

.md-typeset h1 {
    font-size: 2.5em;
    font-weight: 300;
    letter-spacing: -0.02em;
}

.md-typeset h2 {
    font-size: 2em;
    font-weight: 300;
    letter-spacing: -0.01em;
}

.md-typeset h3 {
    font-size: 1.5em;
    font-weight: 400;
}

.md-typeset h4 {
    font-size: 1.25em;
    font-weight: 500;
}

.md-typeset h5 {
    font-size: 1.125em;
    font-weight: 500;
}

.md-typeset h6 {
    font-size: 1em;
    font-weight: 500;
}

/* Paragraphs */
.md-typeset p {
    margin: 0 0 1em;
}

/* Lists */
.md-typeset ul,
.md-typeset ol {
    margin: 0 0 1em;
    padding-left: 1.5em;
}

.md-typeset li {
    margin: 0.25em 0;
}

/* Code */
.md-typeset code {
    background-color: var(--md-code-bg-color);
    color: var(--md-code-fg-color);
    padding: 0.125em 0.25em;
    border-radius: 0.125em;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.85em;
}

.md-typeset pre {
    background-color: var(--md-code-bg-color);
    color: var(--md-code-fg-color);
    border-radius: 0.25em;
    padding: 1em;
    margin: 1em 0;
    overflow-x: auto;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.85em;
    line-height: 1.4;
}

.md-typeset pre code {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
}

/* Tables */
.md-typeset table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
    margin: 1em 0;
    border: 1px solid var(--md-default-fg-color--lightest);
}

.md-typeset th,
.md-typeset td {
    padding: 0.5em 1em;
    border-bottom: 1px solid var(--md-default-fg-color--lightest);
    text-align: left;
}

.md-typeset th {
    background-color: var(--md-code-bg-color);
    font-weight: 500;
}

/* Links */
.md-typeset a {
    color: var(--md-primary-fg-color);
    text-decoration: none;
}

.md-typeset a:hover {
    text-decoration: underline;
}

/* Blockquotes */
.md-typeset blockquote {
    border-left: 4px solid var(--md-default-fg-color--lightest);
    padding-left: 1em;
    margin: 1em 0;
    color: var(--md-default-fg-color--light);
}

/* Admonitions */
.admonition {
    margin: 1.5625em 0;
    padding: 0 0.75em;
    overflow: hidden;
    page-break-inside: avoid;
    border-left: 0.25em solid;
    border-radius: 0.125em;
    box-shadow: 0 0.25em 0.5em rgba(0, 0, 0, 0.05);
}

.admonition > :last-child {
    margin-bottom: 0.75em;
}

.admonition-title {
    position: relative;
    margin: 0 -0.75em 0.75em;
    padding: 0.5em 0.75em 0.5em 2.5em;
    font-weight: 700;
    background-color: rgba(68, 138, 255, 0.1);
}

.admonition-title::before {
    position: absolute;
    top: 0.5em;
    left: 0.75em;
    width: 1.25em;
    height: 1.25em;
    content: attr(data-icon);
}

/* Note admonition */
.admonition.note {
    border-color: var(--md-admonition-note-color);
}

.admonition.note > .admonition-title {
    background-color: rgba(68, 138, 255, 0.1);
}

/* Tip admonition */
.admonition.tip {
    border-color: var(--md-admonition-tip-color);
}

.admonition.tip > .admonition-title {
    background-color: rgba(0, 200, 83, 0.1);
}

/* Warning admonition */
.admonition.warning {
    border-color: var(--md-admonition-warning-color);
}

.admonition.warning > .admonition-title {
    background-color: rgba(255, 145, 0, 0.1);
}

/* Danger admonition */
.admonition.danger {
    border-color: var(--md-admonition-danger-color);
}

.admonition.danger > .admonition-title {
    background-color: rgba(255, 82, 82, 0.1);
}

/* Success admonition */
.admonition.success {
    border-color: var(--md-admonition-success-color);
}

.admonition.success > .admonition-title {
    background-color: rgba(0, 230, 118, 0.1);
}

/* Info admonition */
.admonition.info {
    border-color: var(--md-admonition-info-color);
}

.admonition.info > .admonition-title {
    background-color: rgba(0, 184, 212, 0.1);
}

/* Question admonition */
.admonition.question {
    border-color: var(--md-admonition-question-color);
}

.admonition.question > .admonition-title {
    background-color: rgba(156, 39, 176, 0.1);
}

/* Quote admonition */
.admonition.quote {
    border-color: var(--md-admonition-quote-color);
}

.admonition.quote > .admonition-title {
    background-color: rgba(158, 158, 158, 0.1);
}

/* Responsive design */
@media (max-width: 768px) {
    .md-content__inner {
        padding: 0 8px;
    }
    
    .md-typeset {
        font-size: 14px;
    }
    
    .md-typeset h1 {
        font-size: 2em;
    }
    
    .md-typeset h2 {
        font-size: 1.75em;
    }
}
        `;
    }
}