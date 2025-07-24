# Material for MkDocs CSS Integration Guide

## Caminho dos Assets

Os arquivos CSS do Material for MkDocs devem ser armazenados em:
```
assets/css/
├── material.css          # CSS principal do tema Material
├── palette.css           # Paleta de cores
└── admonitions.css       # Estilos específicos para admonitions
```

## Como Gerar e Obter os Arquivos CSS

### Método 1: Instalação Local (Recomendado)

1. **Instalar Python e MkDocs Material:**
   ```bash
   pip install mkdocs-material
   ```

2. **Criar um projeto MkDocs temporário:**
   ```bash
   mkdocs new temp-project
   cd temp-project
   ```

3. **Configurar mkdocs.yml:**
   ```yaml
   theme:
     name: material
     palette:
       - scheme: default
         primary: blue
         accent: orange
   ```

4. **Construir o site:**
   ```bash
   mkdocs build
   ```

5. **Extrair os arquivos CSS:**
   Os arquivos CSS estarão em `site/assets/stylesheets/`. Copie:
   - `main.*.css` → `assets/css/material.css`
   - `palette.*.css` → `assets/css/palette.css`

### Método 2: CDN (Alternativa)

Você pode baixar diretamente do CDN jsDelivr:

```bash
# CSS principal
curl -o assets/css/material.css "https://cdn.jsdelivr.net/npm/mkdocs-material@9.5.3/src/assets/stylesheets/main.css"

# Paleta de cores
curl -o assets/css/palette.css "https://cdn.jsdelivr.net/npm/mkdocs-material@9.5.3/src/assets/stylesheets/palette.css"
```

### Método 3: Script de Extração Automatizada

```bash
#!/bin/bash
# extract-material-css.sh

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Instalar mkdocs-material
pip install mkdocs-material

# Criar projeto temporário
mkdocs new temp-mkdocs
cd temp-mkdocs

# Configurar tema
cat > mkdocs.yml << EOF
site_name: Temp
theme:
  name: material
  palette:
    - scheme: default
      primary: blue
      accent: orange
EOF

# Construir site
mkdocs build

# Copiar CSS para o projeto
cp site/assets/stylesheets/main.*.css "$OLDPWD/assets/css/material.css"
cp site/assets/stylesheets/palette.*.css "$OLDPWD/assets/css/palette.css"

# Limpar
cd "$OLDPWD"
rm -rf "$TEMP_DIR"

echo "CSS files extracted to assets/css/"
```

## Integração no Código

O `MarkdownRenderer.ts` já está preparado para usar os arquivos CSS. Para integrar:

1. **Substitua o método `getMaterialCss()`** em `src/preview/MarkdownRenderer.ts`:

```typescript
private getMaterialCss(): string {
    const cssFiles = [
        'material.css',
        'palette.css', 
        'admonitions.css'
    ];
    
    let combinedCss = '';
    
    for (const file of cssFiles) {
        try {
            const cssPath = path.join(this._extensionUri.fsPath, 'assets', 'css', file);
            if (fs.existsSync(cssPath)) {
                combinedCss += fs.readFileSync(cssPath, 'utf-8') + '\n';
            }
        } catch (error) {
            console.warn(`Could not load CSS file: ${file}`);
        }
    }
    
    return combinedCss || this.getFallbackCss();
}

private getFallbackCss(): string {
    // Retorna o CSS atual como fallback
    return `/* CSS inline atual */`;
}
```

2. **Adicione o import do fs** no topo do arquivo:
```typescript
import * as fs from 'fs';
```

## Personalização

### Paleta de Cores Personalizada

Para personalizar as cores, edite as variáveis CSS em `assets/css/palette.css`:

```css
:root {
    --md-primary-fg-color: #1976d2;
    --md-primary-fg-color--light: #64b5f6;
    --md-primary-fg-color--dark: #0d47a1;
    --md-accent-fg-color: #ff5722;
}
```

### Admonitions Customizadas

Adicione novos tipos de admonition em `assets/css/admonitions.css`:

```css
.admonition.custom {
    border-color: #e91e63;
}

.admonition.custom > .admonition-title {
    background-color: rgba(233, 30, 99, 0.1);
}
```

## Versionamento

- Mantenha os arquivos CSS no controle de versão
- Documente a versão do Material for MkDocs usada
- Teste a compatibilidade ao atualizar versões

## Troubleshooting

### CSS não carrega
- Verifique se os arquivos estão em `assets/css/`
- Confirme as permissões de leitura
- Verifique o console do VS Code para erros

### Estilos não aplicados
- Confirme que as classes CSS estão corretas
- Verifique se o HTML gerado pelo markdown-it corresponde ao esperado
- Use o Developer Tools do VS Code para debug

### Performance
- Considere minificar os arquivos CSS para produção
- Combine arquivos CSS pequenos em um único arquivo
- Use cache para evitar releituras desnecessárias