# Conversor de Table of Contents (TOC) - Funcionalidades Aprimoradas

O conversor de TOC foi completamente reescrito para suportar **todas** as funcionalidades do macro Table of Contents do Confluence, baseado na [documentação oficial](https://confluence.atlassian.com/doc/table-of-contents-macro-182682099.html).

## ✨ Funcionalidades Implementadas

### 1. **Output Type (type)**
- `list` (padrão): Produz uma lista vertical hierárquica
- `flat`: Produz um menu horizontal de links

### 2. **Display Section Numbering (outline)**
- `true`: Aplica numeração hierárquica aos cabeçalhos (1.1, 1.2, 1.3)
- `false` (padrão): Lista normal sem numeração

### 3. **List Style (style)**
Suporte completo para todos os estilos de bullets:
- `default`: Estilo padrão do Confluence (diferentes por nível)
- `none`: Sem bullets
- `disc`: Círculo preenchido (•)
- `circle`: Círculo aberto (◦)
- `square`: Quadrado (▪)
- `decimal`: Lista numerada (1, 2, 3)
- `lower-alpha`: Lista alfabética minúscula (a, b, c)
- `upper-alpha`: Lista alfabética maiúscula (A, B, C)
- `lower-roman`: Numerais romanos minúsculos (i, ii, iii)
- `upper-roman`: Numerais romanos maiúsculos (I, II, III)

### 4. **Separator (separator)** - Para tipo `flat`
- `brackets`: Cada item entre colchetes [ ]
- `braces`: Cada item entre chaves { }
- `parens`: Cada item entre parênteses ( )
- `pipe` (padrão): Separação por pipe |
- **Custom**: Qualquer texto personalizado como separador

### 5. **Heading Levels**
- `minLevel`: Nível mínimo de cabeçalho (padrão: 1)
- `maxLevel`: Nível máximo de cabeçalho (padrão: 6)

### 6. **Filtros de Cabeçalhos**
- `include`: Regex para incluir cabeçalhos específicos
- `exclude`: Regex para excluir cabeçalhos específicos
- Suporte completo a expressões regulares com fallback para busca literal

### 7. **Indentação Personalizada (indent)**
- Suporte a indentação customizada em pixels (ex: "10px")
- Indentação progressiva automática para hierarquia

### 8. **URLs Absolutas (absoluteUrl)**
- `true`: Gera URLs completas usando confluenceBaseUrl
- `false` (padrão): URLs relativas com âncoras

### 9. **CSS Class (class)**
- Adiciona classe CSS personalizada com wrapper `<div>`
- Útil para estilização customizada

### 10. **Printable (printable)**
- `true` (padrão): TOC aparece na impressão
- `false`: TOC não aparece na impressão (com nota explicativa)

## 🔧 Funcionalidades Técnicas

### Numeração Hierárquica Inteligente
- Geração automática de numeração no formato 1.1, 1.2.1, etc.
- Reset automático de contadores para níveis superiores

### Geração de Slugs
- Conversão automática de títulos para âncoras válidas
- Remoção de caracteres especiais e normalização

### Filtragem Avançada
- Suporte a regex completo para include/exclude
- Fallback para busca literal caso regex seja inválido
- Filtros case-insensitive

### Extração Recursiva de Texto
- Suporte a elementos inline complexos (strong, em, link)
- Extração completa de texto de cabeçalhos aninhados

## 📝 Exemplos de Uso

### TOC Lista Simples
```confluence
{toc}
```
Gera uma lista hierárquica padrão com todos os cabeçalhos.

### TOC com Numeração
```confluence
{toc:outline=true}
```
Gera lista com numeração hierárquica (1.1, 1.2, etc.).

### TOC Horizontal
```confluence
{toc:type=flat|separator=pipe}
```
Gera menu horizontal separado por pipes.

### TOC Filtrado
```confluence
{toc:include=Introduction.*|exclude=.*Note|minLevel=2|maxLevel=4}
```
Inclui apenas cabeçalhos que começam com "Introduction", exclui os que terminam com "Note", níveis 2-4.

### TOC com Estilo Romano
```confluence
{toc:style=upper-roman|outline=true}
```
Lista com numerais romanos maiúsculos e numeração hierárquica.

### TOC Flat com Separador Personalizado
```confluence
{toc:type=flat|separator= → }
```
Menu horizontal com setas como separador.

## 🎯 Benefícios da Implementação

1. **Compatibilidade Total**: Suporte a 100% dos parâmetros oficiais do Confluence
2. **Flexibilidade**: Adaptação automática a diferentes tipos de conteúdo
3. **Robustez**: Tratamento de erros e fallbacks inteligentes
4. **Performance**: Análise eficiente de documentos grandes
5. **Reversibilidade**: Preservação de todos os parâmetros via YAML

## 🔄 Integração

O conversor se integra automaticamente ao sistema de conversão ADF→Markdown:
- Análise completa do documento para extração de cabeçalhos
- Preservação de metadados para conversão reversa
- Suporte a URLs base para links absolutos
- Contexto de documento para análise global

Esta implementação garante que qualquer TOC do Confluence seja convertido corretamente para Markdown mantendo toda sua funcionalidade e configuração original. 