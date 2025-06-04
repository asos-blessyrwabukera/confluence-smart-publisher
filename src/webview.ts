import * as vscode from 'vscode';

export function getEmojiPickerHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const nonce = Date.now().toString();
    const emojiMartCdn = 'https://cdn.jsdelivr.net/npm/@emoji-mart/data@1.1.2/dist/index.umd.js';
    const emojiMartPickerCdn = 'https://cdn.jsdelivr.net/npm/@emoji-mart/react@1.1.1/dist/index.umd.js';
    const emojiMartCss = 'https://cdn.jsdelivr.net/npm/@emoji-mart/css@1.1.2/dist/index.css';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; script-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; font-src ${webview.cspSource} https://cdn.jsdelivr.net;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Emoji Picker</title>
        <link rel="stylesheet" href="${emojiMartCss}">
        <style>
            body {
                padding: 20px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            #picker {
                width: 100%;
                height: 400px;
            }
        </style>
    </head>
    <body>
        <div id="picker"></div>
        <script src="${emojiMartCdn}"></script>
        <script src="${emojiMartPickerCdn}"></script>
        <script nonce="${nonce}">
            (async () => {
                const data = await (await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data@1.1.2/dist/index.umd.js')).text();
                const picker = new EmojiMart.Picker({
                    data: data,
                    onEmojiSelect: (emoji) => {
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({ 
                            command: 'emojiSelected', 
                            emoji: emoji.native 
                        });
                    },
                    locale: 'en',
                    theme: 'auto',
                    set: 'twitter',
                    previewPosition: 'none',
                    skinTonePosition: 'none',
                    autoFocus: true
                });
                document.getElementById('picker').appendChild(picker);
            })();
        </script>
    </body>
    </html>
    `;
} 