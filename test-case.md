# Teste de Renderização Markdown com Material for MkDocs

Este documento serve como caso de teste abrangente para validar a renderização de elementos Markdown com estilização Material for MkDocs.

## H2: Formatação de Texto

Este é um parágrafo regular com **texto em negrito**, *texto em itálico*, e ***texto em negrito e itálico***. Também podemos usar `código inline` para destacar pequenos trechos de código.

### H3: Listas

#### Lista não numerada:
- Item principal 1
  - Subitem 1.1
  - Subitem 1.2
    - Sub-subitem 1.2.1
- Item principal 2
- Item principal 3

#### Lista numerada:
1. Primeiro item
2. Segundo item
   1. Subitem numerado 2.1
   2. Subitem numerado 2.2
3. Terceiro item

### H3: Links e Imagens

[Link para GitHub](https://github.com)

[Link com título](https://github.com "GitHub Homepage")

![Imagem de exemplo](https://via.placeholder.com/400x200/0066cc/ffffff?text=Exemplo+de+Imagem)

## H2: Blocos de Código

### Código sem sintaxe específica:
```
function exemplo() {
    console.log("Olá mundo!");
}
```

### JavaScript com syntax highlighting:
```javascript
class MarkdownRenderer {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        this.md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
        });
    }

    render(content) {
        return this.md.render(content);
    }
}
```

### Python:
```python
def fibonacci(n):
    """Calcula o n-ésimo número de Fibonacci."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Exemplo de uso
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

### TypeScript:
```typescript
interface PreviewConfig {
    theme: string;
    autoUpdate: boolean;
    debounceMs: number;
}

export class PreviewPanel implements vscode.Disposable {
    private readonly config: PreviewConfig;
    
    constructor(config: PreviewConfig) {
        this.config = config;
    }
    
    dispose(): void {
        // Cleanup resources
    }
}
```

## H2: Tabelas

| Funcionalidade | Status | Prioridade | Notas |
|---------------|--------|------------|-------|
| Renderização básica | ✅ Completo | Alta | Implementado |
| Admonitions | ✅ Completo | Alta | Suporte a múltiplos tipos |
| Syntax highlighting | 🔄 Em progresso | Média | Parcialmente implementado |
| Live preview | ✅ Completo | Alta | Com debounce |
| Temas customizados | ❌ Pendente | Baixa | Planejado para v2 |

## H2: Citações

> Esta é uma citação simples.
> 
> Pode ter múltiplas linhas e ainda funcionar perfeitamente.

> ### Citação com formatação
> 
> Você pode incluir **formatação** dentro de citações:
> 
> - Listas
> - `Código`
> - Links: [exemplo](https://example.com)

## H2: Admonitions (Extensões)

!!! note "Nota Importante"
    Esta é uma admonition do tipo "note". É útil para destacar informações importantes que não são avisos ou erros.
    
    Pode conter múltiplos parágrafos e outros elementos de formatação.

!!! tip "Dica Útil"
    Use admonitions do tipo "tip" para compartilhar dicas e truques que podem ser úteis para o leitor.

!!! warning "Aviso"
    Admonitions de aviso devem ser usadas para alertar sobre possíveis problemas ou coisas que requerem atenção.

!!! danger "Perigo"
    Use este tipo para alertas críticos sobre ações que podem causar danos ou perda de dados.

!!! success "Sucesso"
    Perfeito para indicar que uma operação foi concluída com sucesso ou para destacar resultados positivos.

!!! info "Informação"
    Para informações adicionais que complementam o conteúdo principal.

!!! question "Pergunta Frequente"
    Ideal para seções de FAQ ou quando você quer destacar perguntas comuns.

!!! quote "Citação Especial"
    Para citações importantes ou depoimentos que merecem destaque especial.

## H2: Elementos Avançados

### H3: Linha Horizontal

---

### H3: Lista de Tarefas

- [x] Implementar MarkdownRenderer
- [x] Criar PreviewPanel
- [x] Adicionar suporte a admonitions
- [ ] Implementar syntax highlighting avançado
- [ ] Adicionar suporte a diagramas
- [ ] Criar temas customizados

### H3: Código Inline vs Blocos

Compare `const variavel = "valor"` (inline) com:

```javascript
const variavel = "valor";
console.log(variavel);
```

### H3: Combinações Complexas

!!! tip "Admonition com Código"
    Você pode incluir código dentro de admonitions:
    
    ```typescript
    interface Config {
        enabled: boolean;
        timeout: number;
    }
    ```
    
    E também **formatação** e [links](https://example.com).

## H2: Casos Especiais

### H3: Caracteres Especiais

Caracteres que podem precisar de escape: & < > " '

### H3: HTML Inline

Às vezes precisamos de <strong>HTML inline</strong> ou <em style="color: blue;">HTML com estilos</em>.

### H3: Matemática (se suportada)

Inline: $E = mc^2$

Bloco:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## H2: Conclusão

Este documento testa todos os elementos principais do Markdown que devem ser suportados pelo preview da extensão Confluence Smart Publisher. A renderização deve manter a fidelidade visual com o tema Material for MkDocs.

### Checklist de Validação:

1. ✅ Hierarquia de cabeçalhos (H1-H6)
2. ✅ Formatação de texto (negrito, itálico, código)
3. ✅ Listas (numeradas e não-numeradas)
4. ✅ Links e imagens
5. ✅ Blocos de código com syntax highlighting
6. ✅ Tabelas
7. ✅ Citações
8. ✅ Admonitions (8 tipos diferentes)
9. ✅ Elementos especiais (linha horizontal, tarefas)
10. ✅ Casos especiais (HTML, caracteres especiais)