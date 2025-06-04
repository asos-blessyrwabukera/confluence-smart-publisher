import * as vscode from 'vscode';

export function getEmojiPickerHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const nonce = Date.now().toString();
    const emojiMartCdn = 'https://cdn.jsdelivr.net/npm/emoji-mart@5.4.0/dist/browser.js';

    return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-eval' 'unsafe-inline' ${webview.cspSource} https://cdn.jsdelivr.net; style-src ${webview.cspSource} 'unsafe-inline'; connect-src *; img-src data: https:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Selecionar Emoji</title>
    </head>
    <body>
        <div id="picker"></div>
        <script src="${emojiMartCdn}"></script>
        <script nonce="${nonce}">
            const picker = new EmojiMart.Picker({
                onEmojiSelect: (emoji) => {
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({ command: 'emojiSelected', emoji: emoji.native });
                },
                locale: 'pt',
                theme: 'auto'
            });
            document.getElementById('picker').appendChild(picker);
        </script>
    </body>
    </html>
    `;
} 