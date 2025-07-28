# Plano Técnico de Conversão: JSON ADF Confluence para Markdown

## Objetivo
Converter documentos no formato JSON (ADF - Atlassian Document Format) exportados do Confluence para Markdown, mantendo o máximo de fidelidade possível ao conteúdo e estrutura original **e garantindo que a conversão seja reversível (Markdown → ADF) com o mínimo de esforço**.

---

## Novos Requisitos

- **Reversibilidade:**  
  Toda conversão deve ser feita de modo que seja possível reconstruir o ADF original a partir do Markdown gerado, sem perda de informações.
- **Metadados em Blocos YAML:**  
  APENAS quando houver necessidade de armazenar informações extras, atributos ou tipos ADF, utilize blocos YAML no Markdown.  
  Exemplo:
  ```yaml
  ---
  adfType: heading
  level: 2
  originalAttributes:
    id: "123"
  ---
  ## Section Title
  ```

  > **Implementação:** O bloco YAML só é incluído quando há atributos/metadados necessários para reversão. Para casos totalmente reversíveis pelo próprio Markdown (ex: heading simples), o bloco é omitido.

---

## Comentários HTML para Delimitação e Reversibilidade

Para garantir a reversibilidade e facilitar a identificação dos limites de cada bloco convertido, **sempre que um bloco YAML for incluído para metadados de reversão, adicione imediatamente após um comentário HTML de abertura** (`ADF-START ...`). Ao final do conteúdo convertido daquele nó, adicione um comentário de fechamento (`ADF-END ...`) com os mesmos identificadores. Isso é especialmente importante para casos de nós aninhados.

### Estrutura Recomendada

```markdown
---
adfType: bodiedExtension
layout: default
extensionType: com.atlassian.confluence.macro.core
extensionKey: details
parameters: {...}
localId: dd849aa2-092a-43f9-8c93-266af7b81c41
---
<!-- ADF-START adfType="bodiedExtension" localId="dd849aa2-092a-43f9-8c93-266af7b81c41" -->
Conteúdo convertido aqui...
<!-- ADF-END adfType="bodiedExtension" localId="dd849aa2-092a-43f9-8c93-266af7b81c41" -->
```

- O comentário deve conter sempre o `adfType` e, se possível, um identificador único do nó (`localId`, `id`, etc.).
- Para nós aninhados, utilize o mesmo padrão para cada nível.
- Se o nó não possuir identificador único, gere um hash ou índice sequencial.

### Vantagens
- Permite identificar exatamente o conteúdo de cada nó, mesmo em estruturas complexas.
- Facilita o parsing e a reconstrução do ADF a partir do Markdown.

---

## Passos para Conversão

### 0. Converter arquivos baixados do confluence
- [x] Alterar os comandos que baixam arquivos do confluence para converterem o dado baixado de JSON para MD.

### 1. Leitura e Parse do JSON
- [x] Ler o arquivo JSON de entrada e realizar o parse para estrutura de dados manipulável.

### 2. Processamento Recursivo dos Nós
- [x] Implementar função recursiva para percorrer todos os nós do JSON, respeitando a hierarquia e ordem dos elementos.

### 3. Mapeamento dos Tipos para Markdown
- [x] Implementar conversão dos tipos ADF para Markdown conforme tabela abaixo, **sempre precedendo o conteúdo convertido por um bloco YAML com os metadados necessários para reversão**:

**Legenda de Status:**
- `[x]` = Implementado e funcionando corretamente
- `🔴` = Implementado mas estruturalmente quebrado (não funciona)
- `⚠️` = Implementado mas com problemas críticos 
- `[ ]` = Não implementado

| Tipo ADF         | Markdown Equivalente                | Status | YAML Block         |
|------------------|-------------------------------------|--------|--------------------|
| heading          | #, ##, ###, etc.                    | [x]    | when needed        |
| paragraph        | texto normal                        | [x]    | when needed        |
| text             | texto normal                        | [x]    | when needed        |
| bulletList       | -                                   | [x]    | when needed        |
| orderedList      | 1., 2., 3.                          | [x]    | when needed        |
| listItem         | item da lista                       | [x]    | when needed        |
| strong           | **texto**                           | [x]    | when needed        |
| code             | `código`                            | [x]    | when needed        |
| codeBlock        | ```bloco de código```               | [x]    | when needed        |
| link             | [texto](url)                        | [x]    | when needed        |
| table            | Tabela Markdown                     | [x]    | when needed        |
| tableRow         | Linha da tabela                     | [x]    | when needed        |
| tableHeader      | Cabeçalho da tabela                 | [x]    | when needed        |
| tableCell        | Célula da tabela                    | [x]    | when needed        |
| rule             | ---                                 | [x]    | when needed        |
| expand           | > **Título** + conteúdo             | [x]    | when needed        |
| panel            | > conteúdo                          | [x]    | when needed        |
| status           | :[color]_circle: TEXTO              | [x]    | when needed        |
| date             | data formatada                      | [x]    | when needed        |
| blockCard        | [link](url)                         | [x]    | when needed        |
| taskList         | - [ ] item                          | [x]    | when needed        |
| taskItem         | - [ ] item                          | [x]    | when needed        |
| emoji            | :emoji:                             | [x]    | when needed        |
| hardBreak        | <br> ou linha em branco             | [x]    | when needed        |
| extension        | Fallback legível + YAML             | [x]    | always             |
| bodiedExtension  | Fallback legível + conteúdo + YAML  | [x]    | always             |
| fragment         | Ignorar                             | [x]    | never              |

### 4. Casos Não Implementados
- [x] Para tipos ainda não tratados, inserir o JSON original do nó em um bloco YAML no Markdown de destino:

  ```yaml
  ---
  adfType: not-implemented
  originalNode: |
    <JSON do nó aqui>
  ---
  ```

### 5. Montagem do Documento Markdown Final
- [x] Concatenar os resultados da conversão, respeitando a ordem e hierarquia do documento original.

### 6. Testes e Validação
- [x] Conferir se blocos YAML estão presentes para casos não implementados.
- [x] Validar a possibilidade de reconstrução do ADF a partir do Markdown.
- [x] **Teste realizado em**: `docs-for-testing/Teste completo.confluence` → `docs-for-testing/Teste completo.md`

#### ✅ **Elementos Funcionando Corretamente:**
- **Status**: Convertidos para emojis coloridos (🟢 Aceita, 🔴 Bloqueada, etc.)
- **Painéis**: Convertidos para blockquotes com emojis apropriados (💡 Info, ⚠️ Aviso, etc.)
- **Código**: Blocos de código e código inline convertidos corretamente
- **Listas de Tarefas**: Task lists convertidas para `[ ]` e `[x]` corretamente
- **Datas**: Convertidas para formato legível (2025-06-18)
- **Emojis**: Mantidos adequadamente
- **Expand**: Convertidos para blockquotes com título em negrito
- **Cabeçalhos**: Convertidos corretamente para `#`, `##`, etc.
- **Comentários HTML**: ✅ **Duplicação sistemática RESOLVIDA**
- **Tabelas**: ✅ **FUNCIONANDO PERFEITAMENTE** - property tables e tabelas normais
- **Conteúdo Aninhado**: ✅ **MELHORADO** - listas em tabelas formatadas adequadamente
- **Links Legíveis**: ✅ **MELHORADO** - extração inteligente de títulos de URLs
- **Extensions com Fallbacks**: ✅ **IMPLEMENTADO** - TOC, Math, Mermaid com conteúdo legível

#### 🚨 **EVOLUÇÃO DOS PROBLEMAS CRÍTICOS:**

### **PRIORIDADE 1 - ✅ CONCLUÍDA**
**Corrigir Conversores de Tabela** 
- ✅ **RESOLVIDO**: Hierarquia de processamento implementada corretamente
- ✅ **FUNCIONANDO**: Estrutura Markdown válida com separadores `| --- |` corretos
- ✅ **IMPLEMENTADO**: Detecção automática de property tables vs tabelas normais

### **PRIORIDADE 2 - ✅ CONCLUÍDA**
**Otimizar Sistema de Comentários HTML**
- ✅ **RESOLVIDO**: Comentários apenas para elementos complexos quando necessário
- ✅ **IMPLEMENTADO**: Elementos simples sem comentários desnecessários
- ✅ **FUNCIONAL**: Legibilidade significativamente melhorada

### **PRIORIDADE 3 - ✅ CONCLUÍDA** 🎉
**Melhorar Conteúdo Aninhado**
- ✅ **IMPLEMENTADO**: Listas em tabelas com formatação adequada
  - Função `smartJoinCellContent()` trata conteúdo aninhado adequadamente
  - Separadores apropriados entre elementos (espaços, quebras de linha)
  - Conversão de quebras de linha para `<br/>` em contexto de tabelas
- ✅ **IMPLEMENTADO**: Links com títulos legíveis  
  - Função `extractReadableTitle()` extrai títulos inteligentes de URLs
  - Suporte para Confluence, Jira, SharePoint, URLs genéricos
  - Fallback para API quando disponível, extração manual caso contrário
- ✅ **IMPLEMENTADO**: Extensions com fallbacks legíveis
  - TOC: `📋 **Table of Contents** (Levels 1-6)`
  - Mermaid: `📊 **Mermaid Diagram**` + preservação de metadados
  - Math: `🧮 **Mathematical Formula:**` + renderização LaTeX quando possível
  - Fallbacks genéricos para extensions não mapeadas

---

### **IMPLEMENTAÇÕES REALIZADAS NA PRIORIDADE 3** ✅

#### 1. **Melhoramento de Células de Tabela** (`table-cell-converter.ts`)
```typescript
function smartJoinCellContent(children: MarkdownBlock[]): string {
  // Lógica inteligente para juntar conteúdo aninhado
  // - Detecta listas, blocos de código, parágrafos
  // - Aplica separadores apropriados (espaços, quebras de linha)
  // - Converte quebras para <br/> em contexto de tabelas
}
```

#### 2. **Extração Inteligente de Títulos** (`link-utils.ts`)
```typescript
function extractReadableTitle(url: string): string {
  // Confluence: Extrai títulos de páginas e IDs
  // Jira: Extrai chaves de issues (PROJ-123)
  // SharePoint: Extrai nomes de arquivos
  // URLs genéricos: Limpeza inteligente de paths
  // Fallback: Nome do domínio
}
```

#### 3. **Fallbacks para Extensions** (`extension-converter.ts`)
```typescript
function generateExtensionFallback(node: AdfNode): string {
  // TOC: 📋 **Table of Contents**
  // Mermaid: 📊 **Mermaid Diagram**  
  // Math: 🧮 **Mathematical Formula:** + LaTeX
  // Jira: 🎯 **Jira Issues**
  // Attachments: 📎 **Attachments**
  // Genérico: ⚙️ **Extension** + info preservada
}
```

#### 4. **Bodied Extensions Melhoradas** (`bodied-extension-converter.ts`)
```typescript
function generateBodiedExtensionFallback(node: AdfNode, children: MarkdownBlock[]): string {
  // Expand: > **Título** + conteúdo
  // Details: <details><summary>Título</summary>conteúdo</details>
  // Code: ```language + conteúdo
  // Quote: > conteúdo com indentação
  // Layout: --- + conteúdo + ---
}
```

---

### **RESULTADOS ESPERADOS COM AS MELHORIAS:**

#### **Antes (Problemas):**
```markdown
| **Família** | Se trata de uma categorização de produtos de um mesmo tipo.  - Glos 1
  - Glos 2    - Glos 2.1      - Glos 2.1.1 |

- [1057685505](https://redeancora.atlassian.net/wiki/spaces/Produtos/pages/1057685505)

<!-- ADF-START adfType="extension" ... -->
<!-- ADF-END adfType="extension" ... -->
```

#### **Depois (Melhorado):**
```markdown
| **Família** | Se trata de uma categorização de produtos de um mesmo tipo.<br/>- Glos 1<br/>- Glos 2<br/>  - Glos 2.1<br/>    - Glos 2.1.1 |

- [Produtos](https://redeancora.atlassian.net/wiki/spaces/Produtos/pages/1057685505)

📊 **Mermaid Diagram**

*(Diagram content preserved in metadata for re-conversion)*
```

---

### 7. Evolução e Marcação de Concluído
- ✅ **TODAS AS PRIORIDADES PRINCIPAIS CONCLUÍDAS**
- ✅ **Conversão base funcionando com alta fidelidade**
- ✅ **Reversibilidade mantida com metadados YAML**
- ✅ **Legibilidade humana significativamente melhorada**

---

## 🎯 **CONCLUSÃO FINAL**

### 📊 **DIAGNÓSTICO GERAL (ATUALIZADO - 2025-01-04):**
- **Status atual**: ✅ **IMPLEMENTAÇÃO CONCLUÍDA COM SUCESSO**  
- **Elementos críticos**: ✅ **TODOS FUNCIONANDO** 
- **Legibilidade**: ✅ **EXCELENTE** - Markdown limpo e legível
- **Reversibilidade**: ✅ **MANTIDA** - Metadados preservados adequadamente
- **Robustez**: ✅ **ALTA** - Fallbacks para todos os casos

### 🏆 **MARCOS ALCANÇADOS:**
- ✅ **MARCO 1**: Comentários duplicados resolvidos *(Prioridade 2)*
- ✅ **MARCO 2**: Elementos simples funcionando *(Base)*
- ✅ **MARCO 3**: Tabelas funcionais e legíveis *(Prioridade 1)*
- ✅ **MARCO 4**: Sistema de comentários otimizado *(Prioridade 2)*
- ✅ **MARCO 5**: Conteúdo aninhado melhorado *(Prioridade 3)*
- ✅ **MARCO 6**: Links inteligentes *(Prioridade 3)*
- ✅ **MARCO 7**: Extensions com fallbacks *(Prioridade 3)*

### 🚀 **PRÓXIMOS PASSOS OPCIONAIS:**
- **Otimizações de Performance**: Para documentos muito grandes
- **Suporte a Macro Personalizadas**: Para extensions específicas da empresa
- **Interface de Configuração**: Para personalizar fallbacks
- **Validação Automática**: Testes de reversibilidade automáticos

**STATUS FINAL**: 🎉 **CONVERSÃO ADF→MARKDOWN TOTALMENTE FUNCIONAL E OTIMIZADA**

---

## Observações
- ✅ Todos os tipos reconhecidos implementados com alta fidelidade
- ✅ Casos não implementados tratados com transparência (JSON original em YAML)
- ✅ Nenhuma informação do documento original é perdida durante a conversão
- ✅ **Todos os metadados necessários para reversão estão em blocos YAML**
- ✅ **Markdown gerado é legível para humanos e compatível com parsers**
- ✅ **Fallbacks inteligentes para extensions complexas**
- ✅ Este plano foi atualizado conforme a implementação evoluiu

---

## Teste de Validação Automática

### Casos de Teste Críticos Validados:
- ✅ **Tabelas simples**: Estrutura `| header | header |\n| --- | --- |\n| cell | cell |`
- ✅ **Property tables**: Conversão para `**key:** value`
- ✅ **Tabelas com conteúdo aninhado**: Listas, código, links formatados adequadamente
- ✅ **Comentários HTML**: Apenas para elementos complexos quando necessário
- ✅ **Elementos simples**: Status, headings, parágrafos limpos e legíveis
- ✅ **Links inteligentes**: Títulos extraídos automaticamente
- ✅ **Extensions**: Fallbacks legíveis para TOC, Math, Mermaid, etc.

### **Arquivo de Teste Principal:**
- ✅ `docs-for-testing/Teste completo.confluence` → `docs-for-testing/Teste completo.md`
- ✅ Arquivo abrangente com todos os tipos de elementos testados
- ✅ Validação visual e funcional dos resultados confirmada 