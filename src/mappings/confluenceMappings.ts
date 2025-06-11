/**
 * Mapeamentos para conversão de conteúdo do Confluence para Markdown
 */

/**
 * Mapeamento de macros de informação para ícones
 * Quando o ac:name é info, tip, note, warning ou error, é incluído o ícone correspondente no início do valor do title
 */
export const macroIconMap: Record<string, string> = {
    'info': 'ℹ️',
    'tip': '💡',
    'note': '📝',
    'warning': '⚠️',
    'error': '⛔'
};

/**
 * Mapeamento de status para ícones
 * Quando o ac:name é status, toda a macro é substituída pelo ícone e texto correspondente
 */
export const statusIconMap: Record<string, string> = {
    'Em Andamento': '🟡 Em Andamento',
    'Proposta': '🔵 Proposta',
    'Aceita': '🟢 Aceita',
    'Depreciada': '🟡 Depreciada',
    'Bloqueada': '🔴 Bloqueada',
    'Não Iniciada': '🟣 Não Iniciada',
    'Fora de escopo': '🔴 Fora de escopo'
} as const;


/**
 * Tipos de macros do Confluence
 * Mapeamento entre a macro do Confluence e a notação no markdown
 */
export const confluenceMacros = {
    INFO: 'blockquotes',
    TIP: 'blockquotes',
    NOTE: 'blockquotes',
    WARNING: 'blockquotes',
    ERROR: 'blockquotes',
    CODE: 'fenced code blocks',
    EXPAND: 'expand'
} as const;
