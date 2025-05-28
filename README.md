# Confluence Smart Publisher

Extensão para o Visual Studio Code que permite criar, editar, publicar, baixar, comparar e sincronizar páginas do Confluence diretamente do seu editor, utilizando arquivos `.confluence` em formato XML customizado.
Esta extenção utiliza o formato Confluence Storage.

## ✨ Features

- **Publicação direta**: Publique arquivos `.confluence` como páginas no Confluence com um clique.
- **Download de páginas**: Baixe páginas do Confluence por título ou ID, convertendo-as para o formato editável local.
- **Sincronização**: Compare e sincronize o conteúdo local com o publicado no Confluence, escolhendo qual versão manter.
- **Criação a partir de modelo**: Crie novos arquivos baseados em páginas-modelo do Confluence.
- **Formatação automática**: Formate arquivos `.confluence` com regras específicas, incluindo numeração automática de capítulos.
- **Validação de estrutura**: Diagnóstico em tempo real de tags obrigatórias, estrutura e atributos, exibindo problemas no VSCode.
- **Autocompletar de tags**: Sugestões inteligentes para tags e atributos customizados do Confluence.
- **Snippets inteligentes**: Sugestões automáticas de blocos de código XML para tags customizadas, com preenchimento de atributos obrigatórios e opcionais, agilizando a escrita de documentos. Basta escrever `csp` que as opções aparecerão como mágica!
- **Modo HtmlEntities**: Suporte à conversão automática de caracteres especiais para entidades HTML ao publicar ou baixar páginas, evitando problemas de encoding e garantindo compatibilidade total com o Confluence.

### 🚀 DIFERENCIAL: Sincronização de metadados!

> `Labels`, `Propriedades`, `PageId` e `ParentId` são mantidos sempre atualizados entre o arquivo local e a página remota no Confluence.  
> **Qualquer alteração feita localmente (ou no Confluence) é refletida de forma transparente, evitando inconsistências e facilitando o controle de versões e organização dos seus documentos.**


## 📸 Exemplos

> Adicione aqui prints ou GIFs mostrando a publicação, download, diff e autocomplete em ação.

## ⚙️ Requisitos

- VS Code versão 1.96.0 ou superior.
- Conta no Confluence Cloud (Atlassian) com permissão de edição.
- API Token do Confluence (gere em [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)).

## 🔧 Configurações da Extensão

Esta extensão adiciona as seguintes configurações no VSCode:

| Chave                                            | Descrição                                                                                   |
|--------------------------------------------------|---------------------------------------------------------------------------------------------|
| `confluenceSmartPublisher.baseUrl`               | URL base da sua instância Confluence (ex: https://empresa.atlassian.net/wiki)               |
| `confluenceSmartPublisher.username`              | Usuário do Confluence (normalmente o e-mail)                                                |
| `confluenceSmartPublisher.apiToken`              | API Token do Confluence                                                                     |
| `confluenceSmartPublisher.format.numberChapters` | Numera automaticamente os capítulos ao formatar o documento `.confluence` (padrão: true)    |
| `confluenceSmartPublisher.htmlEntitiesMode`      | Ativa a conversão automática de caracteres especiais para entidades HTML ao publicar ou baixar páginas (padrão: true) |

## 🛠️ Comandos Disponíveis

- **Publicar Documento**: Publica o arquivo `.confluence` selecionado no Confluence.
- **Baixar Documento por Título**: Baixa uma página do Confluence pelo título.
- **Baixar Documento por ID**: Baixa uma página do Confluence pelo ID.
- **Criar Documento**: Cria um novo arquivo `.confluence` a partir de um modelo remoto.
- **Formatar Documento**: Formata o arquivo `.confluence` aberto.
- **Comparar Documento Local com o Publicado**: Exibe um diff entre o arquivo local e o publicado.
- **Sincronizar com Publicado no Confluence**: Sincroniza o arquivo local com o conteúdo remoto, permitindo escolher a versão final.
- **Snippets de Tags**: Ao digitar `<` ou `</` em arquivos `.confluence`, sugestões automáticas de tags, atributos e blocos XML são exibidas para agilizar a edição.

Todos os comandos estão disponíveis no menu de contexto do explorador de arquivos ao clicar em arquivos `.confluence` ou pastas.

## 📄 Estrutura dos Arquivos `.confluence`

Esta extenção adiciona um bloco `<csp:parameters>` ao documento, que é utilizado internamete, e que pode ter seus valores alterados.

- `<csp:file_id>`: ID da página no Confluence (preenchido automaticamente após a publicação).
- `<csp:labels_list>`: Lista de labels separadas por vírgula. Inclusões e alteração serão refletidas na página online.
- `<csp:parent_id>`: ID da página pai no Confluence.
- `<csp:properties>`: Propriedades da página (chave/valor). Estas propriedades podem ser alteradas, excluídas ou incluidas novas. Mas cuidado pois alterações podem causar efeitos não esperados.

Exemplo:
```xml
<csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">
  <csp:file_id>123456</csp:file_id>
  <csp:labels_list>user-story,escopo,pendente</csp:labels_list>
  <csp:parent_id>654321</csp:parent_id>
  <csp:properties>
    <csp:key>content-appearance-published</csp:key>
    <csp:value>fixed-width</csp:value>
  </csp:properties>
</csp:parameters>
<!-- Conteúdo da página em formato Confluence Storage -->
```

## 🧩 Dependências

- [cheerio](https://www.npmjs.com/package/cheerio)
- [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)
- [form-data](https://www.npmjs.com/package/form-data)
- [node-fetch](https://www.npmjs.com/package/node-fetch)
- [xml-escape](https://www.npmjs.com/package/xml-escape)

## 🚧 Problemas Conhecidos

- O formato dos arquivos `.confluence` deve seguir rigorosamente a estrutura esperada, senão a publicação pode falhar.
- Apenas Confluence Cloud (Atlassian) é suportado.
- Não há suporte para autenticação por senha, apenas por API Token.

## 📝 Notas de Lançamento

### 0.0.2

- Novos snippets inteligentes para tags customizadas do Confluence.
- Suporte ao modo HtmlEntities: conversão automática de caracteres especiais para entidades HTML ao publicar ou baixar páginas.

### 0.0.1

- Primeira versão pública: publicação, download, formatação, diff e sincronização de páginas do Confluence.

---

## 🧑‍💻 Contribuindo

Contribuições são bem-vindas! Siga as [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines) para garantir as melhores práticas.

## ℹ️ Mais Informações

- [Documentação oficial do VSCode para extensões](https://code.visualstudio.com/api)
- [Documentação oficial do Confluence Cloud REST API](https://developer.atlassian.com/cloud/confluence/rest/)
- [Documentação oficial do Confluence Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html)
  - > Esta documentação é para a versão Data Center, mas também se aplica (pelo menos até o momento) para a versão Cloud.

---

_Divirta-se publicando no Confluence de forma inteligente!_