# Migração de XML para JSON nos arquivos `.confluence`

## Visão Geral

Com a mudança do reconhecimento dos arquivos `.confluence` de XML para JSON, é necessário adaptar toda a extensão para:
- Gerar, ler e validar blocos de metadados (CSP) em formato JSON, não mais XML.
- Remover dependências e utilitários relacionados a XML.
- Atualizar exemplos, documentação e validações para o novo padrão.

---

## Análise das Mudanças Necessárias

### 1. src/confluenceClient.ts
- **Geração e leitura de blocos `<csp:parameters>` em XML:**
  - O código monta, lê e espera blocos XML (`<csp:parameters>`, `<csp:file_id>`, etc).
  - **Ação:** Alterar para gerar, ler e manipular um objeto JSON equivalente, por exemplo:
    ```json
    {
      "csp": {
        "file_id": "...",
        "labels_list": "...",
        "parent_id": "...",
        "properties": [{ "key": "...", "value": "..." }]
      }
    }
    ```
- **Uso de `xml-escape`:**
  - Não será mais necessário escapar strings para XML.
  - **Ação:** Remover dependência e uso de `xml-escape`.
- **Funções de extração de tags e propriedades via regex de XML:**
  - Exemplo: `extractTag`, `extractProperties`.
  - **Ação:** Trocar para leitura direta de propriedades do JSON.

### 2. src/markdownConverter.ts
- **Função `convertHtmlToConfluence` e uso de XML:**
  - Adiciona cabeçalho XML ao conteúdo.
  - **Ação:** Alterar para adicionar bloco JSON no início do arquivo, se necessário.

### 3. src/diagnostics.ts e src/confluenceValidator.ts
- **Validação baseada em tags XML:**
  - Usa cheerio em modo XML para validar estrutura.
  - **Ação:** Trocar validação para estrutura de objeto JSON, validando chaves e tipos.

### 4. Dependências
- **Remover dependências não utilizadas:**
  - `xml-escape`, `cheerio`, `fast-xml-parser` (se não forem mais necessários).

### 5. README.md
- **Atualizar exemplos e instruções:**
  - Trocar exemplos de XML para JSON.
  - Atualizar instruções sobre estrutura dos arquivos `.confluence`.

---

## Pontos Específicos do Fluxo de Conversão (ADF/Markdown)

### Pontos já migrados/cobertos no novo fluxo ADF:
- [x] Geração do bloco CSP em JSON no início do arquivo Markdown.
- [x] Geração do TOC (índice) a partir dos headings do documento ADF.
- [x] Conversão de painéis, status, expand, tabelas, listas, emojis, tasks, etc., com funções específicas para cada tipo de nó ADF.
- [x] Remoção de dependências e lógica baseada em XML.

### Pontos que ainda precisam de revisão/migração/adaptação:
- [x] **Cobertura completa de macros especiais:** Validar se todos os tipos de macros do Confluence (expand, panel, status, code, math, task, emoticon, etc.) e suas variações/aninhamentos estão corretamente mapeados e convertidos no fluxo ADF.
- [ ] **Conversão de tabelas de propriedades:** Garantir que tabelas de propriedades (1 th + 1 td por linha) do ADF sejam convertidas para o formato Markdown especial (`**key:** value`).
- [ ] **Conversão de links especiais:** Validar se todos os tipos de links especiais (Jira, Confluence, etc.) são tratados corretamente no fluxo ADF.
- [ ] **Conversão de datas e times:** Garantir que todos os formatos de data do ADF sejam convertidos corretamente para texto ISO ou formato desejado.
- [ ] **Conversão de blocos de código:** Validar se blocos de código do ADF mantêm a linguagem e o conteúdo fielmente.
- [ ] **Parágrafos vazios e estrutura:** Garantir que parágrafos vazios não gerem Markdown desnecessário.
- [ ] **Padronização de reversibilidade:** Avaliar se todos os blocos reversíveis devem ser JSON puro (em vez de YAML) e padronizar.

---

## Macros Especiais: Mapeamento e Pontos de Atenção

Abaixo estão as macros do Confluence que já estão cobertas, as que precisam de revisão e as que ainda precisam ser implementadas/adaptadas no fluxo ADF:

### Macros já mapeadas e implementadas
- **expand**: Convertida para bloco markdown com título e conteúdo, inclui bloco YAML para reversibilidade. Verificar atributos e casos aninhados.
- **panel**: Convertida para bloco markdown com ícone e texto, inclui bloco YAML. Verificar todos os tipos de painel (note, tip, info, warning, error, custom).
- **status**: Convertida para emoji + texto, sem bloco YAML. Checar se todas as cores e variações estão mapeadas.
- **code** (inline): Convertida para markdown inline `` `code` ``. Verificar necessidade de atributos extras.
- **codeBlock**: Convertida para bloco markdown com linguagem, inclui YAML se houver atributos extras. Garantir fidelidade do conteúdo e linguagem.
- **taskList** e **taskItem**: Convertidas para listas de tarefas. Checar compatibilidade com markdown de tasks.
- **emoji**: Convertida para emoji unicode. Verificar se todos os atributos relevantes são considerados.

### Macros que precisam de atenção/revisão
- **math**: Não há função explícita para "math" ou "mathBlock". Implementar conversão para blocos de fórmula (ex: KaTeX/LaTeX ou imagem).
- **emoticon**: Pode estar parcialmente coberta por `convertEmoji`, mas emoticons do Confluence podem ter nomes/códigos diferentes dos emojis unicode. Verificar e ajustar.
- **panel** (variações): Verificar se todos os tipos de painel estão no mapeamento. Adicionar tipos faltantes.
- **status** (variações): Conferir se todas as cores possíveis do status estão no mapeamento. Adicionar cores faltantes.
- **task** (variações): Checar suporte para tarefas aninhadas ou com atributos extras.
- **Macros aninhadas**: Garantir que macros dentro de outras macros sejam processadas corretamente.

### Outras macros comuns do Confluence (não mapeadas explicitamente)
- **Jira Issue/Link**: Implementar tratamento especial para links de Jira/Confluence, se necessário.
- **User Mention**: Implementar conversão para `@username` ou similar, se aplicável.
- **Property Table**: Implementar lógica para identificar e converter tabelas de propriedades (1 th + 1 td por linha) para markdown especial.

### Resumo das ações necessárias
- [x] Implementar/conferir macro **math**.
- [x] Revisar/ajustar conversão de **emoticon**.
- [x] Garantir cobertura de todos os tipos de **panel** e **status**.
- [x] Checar suporte a macros aninhadas.
- [x] Implementar tratamento para **links especiais** (Jira, Confluence).
- [x] Implementar conversão de **user mention** (se necessário).
- [x] Implementar conversão de **property table**.
- [ ] Implementar uma classe de conversão, que garanta que todas as expecializações delas convertam os filhos, sem que a conversão em si precise se preocupar se ela deve trar ou não os seus filhos
---

## Checklist de Migração

- [x] 1. Migrar geração e leitura do bloco CSP em `confluenceClient.ts` para JSON
- [x] 2. Remover uso e dependência de `xml-escape`
- [x] 3. Adaptar funções de extração de propriedades/tags para JSON
- [x] 4. Atualizar `convertHtmlToConfluence` e outros pontos em `markdownConverter.ts` para JSON
- [x] 5. Refatorar validações em `diagnostics.ts` e `confluenceValidator.ts` para JSON
- [x] 6. Remover dependências não utilizadas (`xml-escape`, `cheerio`, `fast-xml-parser`)
- [ ] 7. Atualizar exemplos e instruções no `README.md` para JSON
- [ ] 8. Testar toda a extensão com arquivos `.confluence` em JSON
- [ ] 9. Revisar cobertura de macros especiais (expand, panel, status, code, math, task, emoticon, etc.) no fluxo ADF
- [ ] 10. Garantir conversão correta de tabelas de propriedades no fluxo ADF
- [ ] 11. Validar tratamento de links especiais (Jira, Confluence, etc.) no fluxo ADF
- [ ] 12. Garantir conversão correta de datas/times no fluxo ADF
- [ ] 13. Validar blocos de código (linguagem/conteúdo) no fluxo ADF
- [ ] 14. Garantir que parágrafos vazios não gerem Markdown desnecessário
- [ ] 15. Padronizar reversibilidade para JSON puro, se necessário

---

> **Dica:** Marque cada item acima conforme for implementando. Se necessário, adicione sub-tarefas para pontos específicos. 