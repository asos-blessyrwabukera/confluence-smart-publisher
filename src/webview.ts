import * as vscode from 'vscode';

export function getEmojiPickerHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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