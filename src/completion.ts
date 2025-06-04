import * as vscode from 'vscode';
import { allowedTags, allowedValues } from './confluenceSchema';

export function registerCompletionProviders(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    // Add suggestions for optional attributes and allowed values
    const optionalAttrsMap: Record<string, string[]> = {
        'ac:layout': ['ac:layout-section', 'ac:layout-cell'],
    };

    // Register CompletionItemProvider for auto complete of custom tags
    const allCustomTags = Object.keys(allowedTags);
    const tagCompletionProvider = vscode.languages.registerCompletionItemProvider('confluence', {
        provideCompletionItems(document, position) {
            const line = document.lineAt(position).text.substring(0, position.character);
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
                    const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Class);
                    item.insertText = new vscode.SnippetString(snippet + `</${tag}>`);
                    item.detail = 'Confluence tag';
                    const documentation = [
                        requiredAttrs.length > 0 ? `Required attributes: ${requiredAttrs.join(', ')}` : undefined,
                        optionalAttrs.length > 0 ? `Optional attributes: ${optionalAttrs.join(', ')}` : undefined,
                        tag === 'csp:parameters' ? 'Parameters namespace' : undefined
                    ].filter(Boolean).join('\n');
                    item.documentation = new vscode.MarkdownString(documentation);
                    return item;
                });
            }
            // Suggestion of closing when typing </
            if (line.endsWith('</')) {
                return allCustomTags.map(tag => {
                    const item = new vscode.CompletionItem(`</${tag}>`, vscode.CompletionItemKind.Class);
                    item.insertText = `${tag}>`;
                    item.detail = 'Close tag';
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
                            item.documentation = new vscode.MarkdownString(`Allowed values: ${allowedValues[allowedKey].join(', ')}`);
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

    context.subscriptions.push(tagCompletionProvider);
} 