# Plano de Refatoração: Conversor ADF para Markdown (Arquitetura Baseada em Classe)

## Objetivo

Refatorar o conversor de ADF para Markdown para utilizar uma arquitetura baseada em classe, onde a classe central gerencia a travessia recursiva dos nós ADF e delega a conversão de cada tipo de nó para funções especializadas. O objetivo é garantir modularidade, extensibilidade e facilitar a manutenção, sem alterar o código atual (para permitir comparação).

---

## Estrutura Proposta de Pastas e Arquivos

```
src/adf-md-converter/
  ├── index.ts                # Ponto de entrada: exporta a classe principal
  ├── adf-to-md-converter.ts  # Classe central de conversão
  ├── converters/
  │     ├── paragraph-converter.ts
  │     ├── heading-converter.ts
  │     ├── table-converter.ts
  │     └── ... (outros tipos, conforme necessidade)
  ├── types.ts                # Tipos compartilhados (AdfNode, MarkdownBlock, etc)
  └── utils.ts                # Funções utilitárias (ex: generateYamlBlock)
```

---

## Detalhes da Implementação

### 1. Classe Principal: `AdfToMarkdownConverter`
- Local: `src/adf-md-converter/adf-to-md-converter.ts`
- Responsável por percorrer recursivamente os nós ADF (bottom-up), processando os filhos antes do nó atual.
- Método principal: `convertNode(node: AdfNode): Promise<MarkdownBlock>`
- Método auxiliar: `convertChildren(node: AdfNode): Promise<MarkdownBlock[]>`
- Seleciona o conversor correto para cada tipo de nó.

### 2. Conversores Específicos
- Cada tipo de nó terá sua função de conversão em um arquivo separado dentro de `converters/`.
- Assinatura padrão:
  ```typescript
  export function convertParagraph(node: AdfNode, children: MarkdownBlock[]): MarkdownBlock
  ```
- Funções puras, sem preocupação com filhos (os filhos já vêm convertidos).

### 3. Tipos Compartilhados
- Centralizados em `types.ts` para fácil manutenção e reuso.
- Exemplos: `AdfNode`, `MarkdownBlock`.

### 4. Utilitários
- Funções auxiliares (ex: geração de YAML, slug, etc) em `utils.ts`.

---

## Vantagens da Nova Arquitetura
- **Modularidade:** Cada conversor é isolado e fácil de testar/manter.
- **Extensibilidade:** Adicionar novos tipos de nó é simples.
- **Comparação:** O código antigo permanece intacto para comparação e fallback.
- **Reversibilidade:** Facilita a propagação de metadados (YAML) e a manutenção da estrutura original.

---

## Lista de Tarefas (Checklist)

- [x] Criar a estrutura de pastas e arquivos conforme o plano
- [x] Implementar `types.ts` com os tipos compartilhados
- [x] Implementar `utils.ts` com funções utilitárias básicas
- [x] Implementar a classe principal `AdfToMarkdownConverter`
- [x] Implementar conversor para parágrafo (`paragraph-converter.ts`)
- [x] Implementar conversor para heading (`heading-converter.ts`)
- [x] Implementar conversor para tabela (`table-converter.ts`)
- [x] Implementar conversores auxiliares de tabela (`table-row-converter.ts`, `table-header-converter.ts`, `table-cell-converter.ts`)
- [x] Implementar conversores para doc
- [x] Implementar conversores para text
- [x] Implementar conversores para bulletList
- [x] Implementar conversores para orderedList
- [x] Implementar conversores para listItem
- [x] Implementar conversores para strong
- [x] Implementar conversores para code
- [x] Implementar conversores para link
- [x] Implementar conversores para blockCard
- [x] Implementar conversores para inlineCard
- [x] Implementar conversores para embedCard
- [x] Implementar conversores para codeBlock
- [x] Implementar conversores para rule
- [x] Implementar conversores para expand
- [x] Implementar conversores para panel
- [x] Implementar conversores para status
- [x] Implementar conversores para date
- [x] Implementar conversores para taskList
- [x] Implementar conversores para taskItem
- [x] Implementar conversores para emoji
- [x] Implementar conversores para emoticon
- [x] Implementar conversores para mention
- [x] Implementar conversores para hardBreak
- [x] Implementar conversores para extension
- [x] Implementar conversores para bodiedExtension
- [x] Implementar conversores para math
- [x] Implementar conversores para mathBlock
- [x] Implementar conversores para easy-math-block
- [ ] Escrever exemplos de uso em `index.ts`
- [ ] Testar a nova arquitetura com exemplos reais de ADF
- [ ] Documentar diferenças e vantagens em relação à solução atual

---

> **Obs:** Marque cada tarefa como concluída (`[x]`) conforme for implementando. 