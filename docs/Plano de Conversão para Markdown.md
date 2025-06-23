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
- [ ] Implementar conversão dos tipos ADF para Markdown conforme tabela abaixo, **sempre precedendo o conteúdo convertido por um bloco YAML com os metadados necessários para reversão**:

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
| extension        | Bloco YAML com JSON original        | [x]    | always             |
| bodiedExtension  | Bloco YAML com JSON original        | [x]    | always             |
| fragment         | Ignorar                             | [x]    | never              |

### 4. Casos Não Implementados
- [ ] Para tipos ainda não tratados, inserir o JSON original do nó em um bloco YAML no Markdown de destino:

  ```yaml
  ---
  adfType: not-implemented
  originalNode: |
    <JSON do nó aqui>
  ---
  ```

### 5. Montagem do Documento Markdown Final
- [ ] Concatenar os resultados da conversão, respeitando a ordem e hierarquia do documento original.

### 6. Testes e Validação
- [ ] Validar o Markdown gerado, conferindo se a estrutura, títulos, listas, tabelas e demais elementos estão corretos.
- [ ] Conferir se blocos YAML estão presentes para casos não implementados.
- [ ] Validar a possibilidade de reconstrução do ADF a partir do Markdown.

### 7. Evolução e Marcação de Concluído
- [ ] Conforme cada tipo for implementado, marcar o respectivo item da tabela como concluído (`[x]`).

---

## Observações
- Sempre que um tipo não for reconhecido ou não houver correspondência, priorizar a transparência incluindo o JSON original em bloco YAML.
- O objetivo é garantir que nenhuma informação do documento original seja perdida durante a conversão.
- **Todos os metadados necessários para reversão devem estar em blocos YAML imediatamente antes do conteúdo convertido.**
- O bloco YAML só é incluído quando necessário para reversão fiel.
- Este plano deve ser atualizado conforme a implementação evoluir. 