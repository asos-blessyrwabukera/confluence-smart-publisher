# 🔧 CSP Utils - Funções Utilitárias

Este módulo fornece funções utilitárias para criação e manipulação de blocos CSP (Confluence Smart Publisher) em diferentes formatos.

## Visão Geral

As funções utilitárias unificam a criação de metadados CSP em três formatos:
- **JSON**: Para arquivos `.confluence`
- **YAML Frontmatter**: Para arquivos `.md` 
- **XML**: Para compatibilidade com formato legado

## Interfaces

### CSPMetadata
```typescript
interface CSPMetadata {
    file_id?: string;
    labels_list?: string;
    parent_id?: string;
    properties?: Array<{ key: string; value: string }>;
    [key: string]: any;
}
```

### CSPBlock
```typescript
interface CSPBlock {
    csp: CSPMetadata;
    content?: any;
}
```

## Funções Principais

### createCSPBlock()
Função principal que cria blocos CSP no formato apropriado baseado na extensão do arquivo.

```typescript
createCSPBlock(
    metadata: CSPMetadata,
    content?: any,
    fileExtension: '.confluence' | '.md' = '.confluence'
): string
```

**Exemplos:**
```typescript
import { createCSPBlock, createDefaultCSPProperties } from './csp-utils.js';

// Para arquivo .confluence (formato JSON)
const metadata = {
    file_id: '123456',
    labels_list: 'user-story,scope',
    parent_id: '789',
    properties: createDefaultCSPProperties()
};
const content = { type: 'doc', content: [...] };
const jsonBlock = createCSPBlock(metadata, content, '.confluence');

// Para arquivo .md (formato YAML frontmatter)
const yamlBlock = createCSPBlock(metadata, undefined, '.md');
```

### createJSONCSPBlock()
Cria blocos CSP no formato JSON para arquivos `.confluence`.

```typescript
createJSONCSPBlock(metadata: CSPMetadata, content?: any): string
```

**Saída:**
```json
{
  "csp": {
    "file_id": "123456",
    "labels_list": "user-story,scope",
    "parent_id": "789",
    "properties": [
      {
        "key": "content-appearance-published",
        "value": "fixed-width"
      }
    ]
  },
  "content": {
    // Conteúdo do documento ADF
  }
}
```

### createYAMLCSPBlock()
Cria blocos CSP no formato YAML frontmatter para arquivos `.md`.

```typescript
createYAMLCSPBlock(metadata: CSPMetadata): string
```

**Saída:**
```yaml
---
file_id: "123456"
labels_list: "user-story,scope"
parent_id: "789"
properties:
  - key: "content-appearance-published"
    value: "fixed-width"
  - key: "content-appearance-draft"
    value: "fixed-width"
---
```

### createXMLCSPBlock()
Cria blocos CSP no formato XML para compatibilidade com formato legado.

```typescript
createXMLCSPBlock(metadata: CSPMetadata): string
```

**Saída:**
```xml
<csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">
  <csp:file_id>123456</csp:file_id>
  <csp:labels_list>user-story,scope</csp:labels_list>
  <csp:parent_id>789</csp:parent_id>
  <csp:properties>
    <csp:key>content-appearance-published</csp:key>
    <csp:value>fixed-width</csp:value>
    <csp:key>content-appearance-draft</csp:key>
    <csp:value>fixed-width</csp:value>
  </csp:properties>
</csp:parameters>
```

## Funções Auxiliares

### createDefaultCSPProperties()
Retorna propriedades CSP padrão para novos documentos.

```typescript
createDefaultCSPProperties(): Array<{ key: string; value: string }>
```

### extractCSPFromJSON()
Extrai metadados CSP de conteúdo JSON.

```typescript
extractCSPFromJSON(jsonContent: string): CSPMetadata | null
```

### extractCSPFromYAML()
Extrai metadados CSP de YAML frontmatter.

```typescript
extractCSPFromYAML(markdownContent: string): CSPMetadata | null
```

### extractCSPIds()
Extrai file_id e parent_id de conteúdo CSP em qualquer formato (JSON, YAML, XML).

```typescript
extractCSPIds(content: string): CSPIds
```

### extractFileId()
Extrai apenas file_id de conteúdo CSP em qualquer formato.

```typescript
extractFileId(content: string): string | null
```

### extractParentId()
Extrai apenas parent_id de conteúdo CSP em qualquer formato.

```typescript
extractParentId(content: string): string | null
```

### extractLabels()
Extracts labels from CSP content in any format (JSON, YAML, XML).

```typescript
extractLabels(content: string): string[]
```

### extractCSPValue()
Generic function to extract any CSP metadata value from content in any format (JSON, YAML, XML).

```typescript
extractCSPValue(content: string, key: string, propertyKey?: string): any
```

**Parameters:**
- `content`: Content containing CSP metadata
- `key`: The key to extract (e.g., 'file_id', 'labels_list', 'properties')
- `propertyKey`: Optional specific property key when extracting from properties array

**Examples:**
```typescript
// Extract simple values
const fileId = extractCSPValue(content, 'file_id');
const parentId = extractCSPValue(content, 'parent_id');
const labels = extractCSPValue(content, 'labels_list'); // Returns array

// Extract all properties
const properties = extractCSPValue(content, 'properties'); // Returns array

// Extract specific property value
const appearance = extractCSPValue(content, 'properties', 'content-appearance-published');
```

## Casos de Uso

### extractProperties()
Extrai propriedades CSP de qualquer formato (JSON, YAML, XML).

```typescript
extractProperties(content: string): Array<{ key: string; value: string }>
```

### 1. Criando um novo arquivo .confluence

```typescript
import { createJSONCSPBlock, createDefaultCSPProperties } from './csp-utils.js';

const metadata = {
    file_id: '',
    labels_list: 'draft,documentation',
    parent_id: '456789',
    properties: createDefaultCSPProperties()
};

const content = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            content: [
                { type: 'text', text: 'Meu novo documento' }
            ]
        }
    ]
};

const fileContent = createJSONCSPBlock(metadata, content);
```

### 2. Convertendo .confluence para .md
```typescript
import { extractCSPFromJSON, createYAMLCSPBlock } from './csp-utils.js';

const confluenceContent = await fs.readFile('document.confluence', 'utf-8');
const cspMetadata = extractCSPFromJSON(confluenceContent);

if (cspMetadata) {
    const yamlFrontmatter = createYAMLCSPBlock(cspMetadata);
    const markdownContent = `${yamlFrontmatter}\n\n# Meu Documento\n\nConteúdo do documento...`;
    await fs.writeFile('document.md', markdownContent);
}
```

### 3. Atualizando metadados em arquivo existente
```typescript
import { extractCSPFromJSON, createJSONCSPBlock } from './csp-utils.js';

const content = await fs.readFile('document.confluence', 'utf-8');
const parsed = JSON.parse(content);
const metadata = parsed.csp;

// Atualizar metadados
metadata.file_id = '999888';
metadata.labels_list = 'published,reviewed';

// Recriar arquivo
const updatedContent = createJSONCSPBlock(metadata, parsed.content);
await fs.writeFile('document.confluence', updatedContent);
```

### 4. Extraindo metadados com função genérica
```typescript
import { extractCSPValue, extractFileId, extractParentId, extractLabels } from './csp-utils.js';

// Funciona com JSON, YAML ou XML
const content = await fs.readFile('document.confluence', 'utf-8'); // ou .md

// Usando função genérica (recomendado)
const fileId = extractCSPValue(content, 'file_id');
const parentId = extractCSPValue(content, 'parent_id');
const labels = extractCSPValue(content, 'labels_list');
const properties = extractCSPValue(content, 'properties');

// Extrair propriedade específica
const appearance = extractCSPValue(content, 'properties', 'content-appearance-published');

// Usando funções específicas (ainda disponíveis)
const fileIdAlt = extractFileId(content);
const parentIdAlt = extractParentId(content);
const labelsAlt = extractLabels(content);

console.log(`Document ID: ${fileId}`);
console.log(`Parent ID: ${parentId}`);
console.log(`Labels: ${labels?.join(', ')}`);
console.log(`Appearance: ${appearance}`);
```

## Benefícios

- **Consistência**: Garante formato uniforme dos metadados CSP
- **Flexibilidade**: Suporte a múltiplos formatos de saída
- **Manutenibilidade**: Centraliza a lógica de criação de blocos CSP
- **Tipo-segurança**: Interfaces TypeScript para melhor desenvolvimento
- **Reusabilidade**: Funções podem ser usadas em qualquer parte do projeto
- **Unificação**: Função genérica `extractCSPValue()` elimina duplicação de código
- **Extensibilidade**: Fácil adição de novos tipos de metadados CSP
- **Performance**: Detecção automática de formato evita múltiplas tentativas de parsing

## Migração

Para migrar código existente:

### Antes:
```typescript
const cspBlock = `<csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">
  <csp:file_id>${fileId}</csp:file_id>
  <csp:labels_list>${labels}</csp:labels_list>
  // ... mais código manual
</csp:parameters>`;
```

### Depois:
```typescript
import { createXMLCSPBlock } from './csp-utils.js';

const metadata = { file_id: fileId, labels_list: labels, parent_id: '', properties: [] };
const cspBlock = createXMLCSPBlock(metadata);
```

### Migração de extractList() para extractLabels()

#### Antes (confluenceClient.ts):
```typescript
private extractTag(tag: string, content: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
    const match = content.match(regex);
    return match ? match[1] : null;
}

private extractList(tag: string, content: string): string[] {
    const value = this.extractTag(tag, content);
    return value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
}

// Usage
const labelsList = this.extractList('csp:labels_list', content);
```

#### Depois (com csp-utils):
```typescript
import { extractLabels } from './csp-utils.js';

// Usage - works with any format (JSON, YAML, XML)
const labelsList = extractLabels(content);
```

### Unificação com extractCSPValue()

#### Antes (múltiplas funções com código duplicado):
```typescript
// Cada função tinha sua própria lógica de detecção de formato
export function extractFileId(content: string): string | null {
    // JSON parsing logic...
    // YAML parsing logic...
    // XML parsing logic...
}

export function extractLabels(content: string): string[] {
    // JSON parsing logic... (duplicated)
    // YAML parsing logic... (duplicated)
    // XML parsing logic... (duplicated)
}

export function extractProperties(content: string): Array<{ key: string; value: string }> {
    // JSON parsing logic... (duplicated)
    // YAML parsing logic... (duplicated)
    // XML parsing logic... (duplicated)
}
```

#### Depois (função genérica unificada):
```typescript
// Uma única função com lógica centralizada
export function extractCSPValue(content: string, key: string, propertyKey?: string): any {
    // Unified JSON, YAML, and XML parsing logic
}

// Funções específicas simplificadas
export function extractFileId(content: string): string | null {
    return extractCSPValue(content, 'file_id');
}

export function extractLabels(content: string): string[] {
    return extractCSPValue(content, 'labels_list') || [];
}

export function extractProperties(content: string): Array<{ key: string; value: string }> {
    return extractCSPValue(content, 'properties') || [];
}
``` 