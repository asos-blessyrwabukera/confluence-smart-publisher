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
- **Html Entities Decode**: Conversão automática de entidades HTML para caracteres especiais ao baixar páginas.

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
| `confluenceSmartPublisher.htmlEntitiesDecode`      | Ativa a conversão automática de entidades HTML para caracteres especiais ao baixar páginas (padrão: false) |

## 🛠️ Comandos Disponíveis

- **Publicar Documento**: Publica o arquivo `.confluence` selecionado no Confluence.
- **Baixar Documento por Título**: Baixa uma página do Confluence pelo título.
- **Baixar Documento por ID**: Baixa uma página do Confluence pelo ID.
- **Criar Documento**: Cria um novo arquivo `.confluence` a partir de um modelo remoto.
- **Formatar Documento**: Formata o arquivo `.confluence` aberto.
- **Comparar Documento Local com o Publicado**: Exibe um diff entre o arquivo local e o publicado.
- **Sincronizar com Publicado no Confluence**: Sincroniza o arquivo local com o conteúdo remoto, permitindo escolher a versão final.
- **Snippets de Tags**: Ao digitar `csp:` em arquivos `.confluence`, sugestões automáticas de tags, atributos e blocos de macros do Confluence são exibidas para agilizar a edição.
- **Decodificar entidades HTML**: Converte entidades HTML (&amp;lt;, &amp;gt;, &amp;amp;, etc.) em caracteres especiais no arquivo `.confluence` selecionado, facilitando a leitura e edição do conteúdo baixado.

Todos os comandos estão disponíveis no menu de contexto do explorador de arquivos ao clicar em arquivos `.confluence` ou pastas.

### 🔄 Fluxo do Comando "Publicar Documento"

O comando **Publicar Documento** (`publishConfluence`) executa uma série de etapas para garantir que o conteúdo do arquivo `.confluence` seja corretamente publicado ou atualizado no Confluence, mantendo metadados e propriedades sincronizados. Veja o fluxo detalhado:

1. **Ação do Usuário**
   - O usuário clica com o botão direito em um arquivo `.confluence` e seleciona "Publicar Documento" ou executa o comando correspondente pelo menu de comandos do VSCode.

2. **Validação Inicial**
   - O comando verifica se o arquivo selecionado possui a extensão `.confluence`. Se não for, exibe uma mensagem de erro.

3. **Leitura do Arquivo**
   - O conteúdo do arquivo é lido para análise e extração de informações.

4. **Verificação de ID da Página**
   - O sistema procura pela tag `<csp:file_id>` no bloco `<csp:parameters>`.
     - **Se existir**: entende que a página já foi publicada anteriormente e realiza uma atualização (update) no Confluence.
     - **Se não existir**: cria uma nova página no Confluence.

5. **Criação ou Atualização da Página**
   - **Criação**:
     - Extrai informações como título, `parentId`, labels e propriedades do bloco `<csp:parameters>`.
     - Remove o bloco `<csp:parameters>` do conteúdo antes de enviar para o Confluence.
     - Cria a página via API REST do Confluence.
     - Se houver imagens locais referenciadas, faz um segundo update para anexá-las corretamente.
   - **Atualização**:
     - Extrai o ID da página.
     - Remove o bloco `<csp:parameters>` do conteúdo.
     - Atualiza o conteúdo da página via API REST.
     - Se houver imagens locais referenciadas, faz um segundo update para anexá-las corretamente.

6. **Sincronização de Metadados**
   - Adiciona labels definidas na tag `<csp:labels_list>`.
   - Atualiza propriedades definidas na tag `<csp:properties>`.

7. **Persistência do ID**
   - Se a página foi criada (não existia `<csp:file_id>`), grava o novo ID no início do arquivo local, dentro do bloco `<csp:parameters>`.

8. **Feedback ao Usuário**
   - Exibe uma mensagem de sucesso com o ID da página publicada ou uma mensagem de erro, caso algo falhe.

> **Observação:** Todo o fluxo é executado de forma transparente, com logs no painel "Confluence Smart Publisher" do VSCode para facilitar o diagnóstico em caso de problemas.

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
  - Manipulação e parsing de HTML/XML no estilo jQuery, facilitando a extração e modificação de elementos.
- [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)
  - Conversão rápida entre XML e JSON, essencial para ler e validar arquivos `.confluence`.
- [form-data](https://www.npmjs.com/package/form-data)
  - Criação de formulários multipart para upload de arquivos (ex: anexar imagens ao Confluence via API).
- [node-fetch](https://www.npmjs.com/package/node-fetch)
  - Realiza requisições HTTP/HTTPS, permitindo comunicação com a API do Confluence.
- [xml-escape](https://www.npmjs.com/package/xml-escape)
  - Escapa caracteres especiais para garantir XML válido ao publicar ou baixar conteúdo.
- [emoji-mart](https://github.com/missive/emoji-mart)
  - Picker de emojis utilizado na extensão

## 🚧 Problemas Conhecidos

- O formato dos arquivos `.confluence` deve seguir rigorosamente a estrutura esperada, senão a publicação pode falhar.
- Apenas Confluence Cloud (Atlassian) é suportado.
- Não há suporte para autenticação por senha, apenas por API Token.

---

## 🧑‍💻 Contribuindo

Contribuições são bem-vindas! Siga as [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines) para garantir as melhores práticas.

## ℹ️ Mais Informações

- [Documentação oficial do VSCode para extensões](https://code.visualstudio.com/api)
- [Documentação oficial do Confluence Cloud REST API](https://developer.atlassian.com/cloud/confluence/rest/)
- [Documentação oficial do Confluence Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html)
  - > Esta documentação é para a versão Data Center, mas boa parte se aplica para a versão Cloud.

---

_Divirta-se publicando no Confluence de forma inteligente!_