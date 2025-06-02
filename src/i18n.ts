import * as vscode from 'vscode';

/**
 * Initialize localization for the extension
 */
export function setupLocalization(): void {
    // A API de localização do VS Code é carregada automaticamente
    // mas podemos fazer alguma inicialização adicional se necessário
    console.log(`Localization initialized: ${vscode.env.language}`);
} 