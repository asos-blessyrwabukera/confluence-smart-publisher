"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfluenceClient = exports.BodyFormat = void 0;
exports.publishConfluenceFile = publishConfluenceFile;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const form_data_1 = __importDefault(require("form-data"));
// @ts-ignore
const xml_escape_1 = __importDefault(require("xml-escape"));
const confluenceFormatter_1 = require("./confluenceFormatter");
var BodyFormat;
(function (BodyFormat) {
    BodyFormat["VIEW"] = "view";
    BodyFormat["EXPORT_VIEW"] = "export_view";
    BodyFormat["STYLED_VIEW"] = "styled_view";
    BodyFormat["STORAGE"] = "storage";
    BodyFormat["EDITOR"] = "editor";
    BodyFormat["ATLAS_DOC_FORMAT"] = "atlas_doc_format";
    BodyFormat["ANONYMOUS_EXPORT_VIEW"] = "anonymous_export_view";
})(BodyFormat || (exports.BodyFormat = BodyFormat = {}));
class ConfluenceClient {
    baseUrl;
    username;
    apiToken;
    constructor() {
        // Preferencialmente, use as configurações do VSCode para armazenar as credenciais
        const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
        this.baseUrl = config.get('baseUrl')?.replace(/\/$/, '') || '';
        this.username = config.get('username') || '';
        this.apiToken = config.get('apiToken') || '';
        if (!this.baseUrl || !this.username || !this.apiToken) {
            throw new Error('Configure baseUrl, username e apiToken nas configurações da extensão.');
        }
    }
    getAuthHeader() {
        const token = Buffer.from(`${this.username}:${this.apiToken}`).toString('base64');
        return { 'Authorization': `Basic ${token}` };
    }
    async getPageByTitle(spaceKey, title) {
        const { default: fetch } = await import('node-fetch');
        const url = `${this.baseUrl}/api/v2/pages?spaceKey=${encodeURIComponent(spaceKey)}&title=${encodeURIComponent(title)}&expand=body.${BodyFormat.STORAGE},version,space`;
        const resp = await fetch(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const data = await resp.json();
        return data.results?.[0] || null;
    }
    async getPageById(pageId, bodyFormat = BodyFormat.STORAGE) {
        const { default: fetch } = await import('node-fetch');
        const url = `${this.baseUrl}/api/v2/pages/${pageId}?body-format=${bodyFormat}`;
        const resp = await fetch(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
        if (resp.status === 404) {
            return null;
        }
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        return await resp.json();
    }
    async downloadConfluencePage(pageId, bodyFormat = BodyFormat.STORAGE, outputDir = 'Baixados') {
        const { default: fetch } = await import('node-fetch');
        const page = await this.getPageById(pageId, bodyFormat);
        if (!page) {
            throw new Error(`Página com ID ${pageId} não encontrada.`);
        }
        const formato = bodyFormat;
        let conteudo;
        try {
            conteudo = page.body?.[formato]?.value;
            // Decodifica entidades HTML se o parâmetro estiver ativado
            const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
            if (config.get('htmlEntitiesDecode', false)) {
                conteudo = (0, confluenceFormatter_1.decodeHtmlEntities)(conteudo);
            }
        }
        catch {
            throw new Error(`Conteúdo body.${formato}.value não encontrado na resposta da API.`);
        }
        const titulo = page.title || `${formato}_${pageId}`;
        const tituloSanitizado = titulo.replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `${tituloSanitizado}.confluence`;
        let baseDir;
        if (path.isAbsolute(outputDir)) {
            baseDir = outputDir;
        }
        else {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            baseDir = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();
            baseDir = path.join(baseDir, outputDir);
        }
        const filePath = path.join(baseDir, fileName);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        // Monta o bloco <csp:parameters>
        // 1. file_id
        const fileId = pageId;
        // 2. parent_id
        const parentId = page.parentId || '';
        // 3. labels_list
        let labelsList = '';
        try {
            // v1 API para labels
            let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
            const url = `${baseUrlV1}/rest/api/content/${pageId}/label`;
            const resp = await fetch(url, { headers: this.getAuthHeader() });
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data.results)) {
                    labelsList = data.results.map((l) => l.name).join(',');
                }
            }
        }
        catch { }
        // 4. properties
        let propertiesXml = '';
        try {
            const props = await this.getContentProperties(pageId);
            if (props.length > 0) {
                const keys = [];
                const values = [];
                for (const prop of props) {
                    if (prop.key && prop.value !== undefined) {
                        keys.push((0, xml_escape_1.default)(String(prop.key)));
                        // value pode ser objeto ou string
                        let val = typeof prop.value === 'object' ? JSON.stringify(prop.value) : String(prop.value);
                        values.push((0, xml_escape_1.default)(val));
                    }
                }
                propertiesXml = `<csp:properties>\n`;
                for (let i = 0; i < keys.length; i++) {
                    propertiesXml += `  <csp:key>${keys[i]}</csp:key>\n  <csp:value>${values[i]}</csp:value>\n`;
                }
                propertiesXml += `</csp:properties>\n`;
            }
            else {
                propertiesXml = `<csp:properties>\n  <csp:key></csp:key>\n  <csp:value></csp:value>\n</csp:properties>\n`;
            }
        }
        catch {
            propertiesXml = `<csp:properties>\n  <csp:key></csp:key>\n  <csp:value></csp:value>\n</csp:properties>\n`;
        }
        // Monta o bloco completo
        const cspBlock = `<csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">\n` +
            `  <csp:file_id>${(0, xml_escape_1.default)(String(fileId))}</csp:file_id>\n` +
            `  <csp:labels_list>${(0, xml_escape_1.default)(labelsList)}</csp:labels_list>\n` +
            `  <csp:parent_id>${(0, xml_escape_1.default)(String(parentId))}</csp:parent_id>\n` +
            propertiesXml +
            `</csp:parameters>\n`;
        // Junta o bloco csp com o conteúdo da página
        let conteudoFinal = cspBlock + '\n' + conteudo;
        fs.writeFileSync(filePath, conteudoFinal, { encoding: 'utf-8' });
        return filePath;
    }
    async uploadAttachment(pageId, filePath) {
        const { default: fetch } = await import('node-fetch');
        // Descobre a base da URL para API v1
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const fileName = path.basename(filePath);
        // Verifica se o anexo já existe
        const checkUrl = `${baseUrlV1}/rest/api/content/${pageId}/child/attachment?filename=${encodeURIComponent(fileName)}`;
        let resp = await fetch(checkUrl, { headers: this.getAuthHeader() });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const results = (await resp.json()).results || [];
        if (results.length > 0) {
            const downloadLink = results[0]._links.download;
            return downloadLink.startsWith('/') ? baseUrlV1 + downloadLink : downloadLink;
        }
        // Upload
        const url = `${baseUrlV1}/rest/api/content/${pageId}/child/attachment`;
        const form = new form_data_1.default();
        form.append('file', fs.createReadStream(filePath), fileName);
        resp = await fetch(url, {
            method: 'POST',
            headers: { ...this.getAuthHeader(), 'X-Atlassian-Token': 'no-check' },
            body: form
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const uploadResults = (await resp.json()).results || [];
        if (uploadResults.length > 0) {
            const downloadLink = uploadResults[0]._links.download;
            return downloadLink.startsWith('/') ? baseUrlV1 + downloadLink : downloadLink;
        }
        return null;
    }
    async _processImagesInContent(content, pageId, baseDir) {
        // Substitui <img src="..."> por links de anexo
        const imgTagRegex = /<img\b[^>]*\bsrc=["']([^"']+)["']/g;
        const replaceImgSrc = async (match, src) => {
            if (src.startsWith('http://') || src.startsWith('https://')) {
                return match; // Não altera URLs absolutas
            }
            const imgPath = path.join(baseDir, src);
            if (!fs.existsSync(imgPath)) {
                return match; // Não altera se não encontrar
            }
            const anexoUrl = await this.uploadAttachment(pageId, imgPath);
            if (anexoUrl) {
                return match.replace(src, anexoUrl);
            }
            return match;
        };
        // Como replace async não é suportado diretamente, processa manualmente
        let result = '';
        let lastIndex = 0;
        let matchArr;
        while ((matchArr = imgTagRegex.exec(content)) !== null) {
            result += content.slice(lastIndex, matchArr.index);
            result += await replaceImgSrc(matchArr[0], matchArr[1]);
            lastIndex = imgTagRegex.lastIndex;
        }
        result += content.slice(lastIndex);
        content = result;
        // Processa <ac:image><ri:attachment ri:filename="..." /></ac:image>
        const acImageRegex = /<ac:image[\s\S]*?<ri:attachment[^>]*ri:filename=["']([^"']+)["'][^>]*/g;
        let acResult = '';
        lastIndex = 0;
        while ((matchArr = acImageRegex.exec(content)) !== null) {
            acResult += content.slice(lastIndex, matchArr.index);
            const filename = matchArr[1];
            const imgPath = path.join(baseDir, filename);
            if (fs.existsSync(imgPath)) {
                await this.uploadAttachment(pageId, imgPath);
            }
            acResult += matchArr[0];
            lastIndex = acImageRegex.lastIndex;
        }
        acResult += content.slice(lastIndex);
        return acResult;
    }
    // Remove todas as labels da página
    async removeAllLabels(pageId) {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/label`;
        const resp = await fetch(url, { headers: this.getAuthHeader() });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const data = await resp.json();
        if (Array.isArray(data.results)) {
            for (const label of data.results) {
                const labelName = label.name;
                const deleteUrl = `${baseUrlV1}/rest/api/content/${pageId}/label?name=${encodeURIComponent(labelName)}`;
                const delResp = await fetch(deleteUrl, { method: 'DELETE', headers: this.getAuthHeader() });
                if (!delResp.ok) {
                    throw new Error(await delResp.text());
                }
            }
        }
    }
    // Remove todas as propriedades da página
    async removeAllProperties(pageId) {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const props = await this.getContentProperties(pageId);
        for (const prop of props) {
            if (prop.key) {
                const url = `${baseUrlV1}/rest/api/content/${pageId}/property/${encodeURIComponent(prop.key)}`;
                const delResp = await fetch(url, { method: 'DELETE', headers: this.getAuthHeader() });
                if (!delResp.ok && delResp.status !== 404) {
                    throw new Error(await delResp.text());
                }
            }
        }
    }
    // Aplica as labels e propriedades do arquivo, removendo todas as existentes antes
    async applyLabelsAndPropertiesFromFile(pageId, labelsList, propriedades) {
        await this.removeAllLabels(pageId);
        await this.removeAllProperties(pageId);
        if (labelsList.length > 0) {
            await this.setPageLabels(pageId, labelsList);
        }
        if (propriedades.length > 0) {
            for (const prop of propriedades) {
                if (prop.key) {
                    await this.updateContentProperty(pageId, prop.key, prop.value);
                }
            }
        }
    }
    // Funções auxiliares para extração de tags, listas e propriedades do conteúdo
    extrairTag(tag, conteudo) {
        // Permite espaços e quebras de linha entre as tags e o valor
        const match = conteudo.match(new RegExp(`<${tag}>[\s\n\r]*([\s\S]*?)[\s\n\r]*<\/${tag}>`, 'i'));
        return match ? match[1].trim() : null;
    }
    extrairLista(tag, conteudo) {
        const valor = this.extrairTag(tag, conteudo);
        if (!valor) {
            return [];
        }
        return valor.split(',').map(s => s.trim()).filter(Boolean);
    }
    extrairPropriedades(conteudo) {
        const props = [];
        const propsBlock = conteudo.match(/<csp:properties>[\s\S]*?<\/csp:properties>/);
        if (!propsBlock) {
            return props;
        }
        const block = propsBlock[0];
        const keyRegex = /<csp:key>([\s\S]*?)<\/csp:key>/g;
        const valueRegex = /<csp:value>([\s\S]*?)<\/csp:value>/g;
        let keyMatch, valueMatch;
        const keys = [];
        const values = [];
        while ((keyMatch = keyRegex.exec(block)) !== null) {
            keys.push(keyMatch[1]);
        }
        while ((valueMatch = valueRegex.exec(block)) !== null) {
            values.push(valueMatch[1]);
        }
        for (let i = 0; i < Math.max(keys.length, values.length); i++) {
            props.push({ key: keys[i] || '', value: values[i] || '' });
        }
        return props;
    }
    async createPageFromFile(filePath) {
        const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
        const pasta = path.dirname(filePath);
        const parentFile = path.join(pasta, '.parent');
        let content = fs.readFileSync(filePath, 'utf-8');
        content = content.replace(/\n +/g, '\n');
        // Extrair informações
        const parentId = this.extrairTag('csp:parent_id', content);
        if (!parentId || !/^[0-9]+$/.test(parentId)) {
            throw new Error(`parentId inválido ou ausente na tag <csp:parent_id>: ${parentId}`);
        }
        const labelsList = this.extrairLista('csp:labels_list', content);
        const propriedades = this.extrairPropriedades(content);
        // Obter spaceId a partir do parentId
        const parentPage = await this.getPageById(parentId);
        if (!parentPage || !parentPage.spaceId) {
            throw new Error(`Não foi possível obter spaceId para parentId ${parentId}`);
        }
        const spaceId = parentPage.spaceId;
        // Título
        const titleBase = path.basename(filePath, path.extname(filePath));
        let cardJiraId = null;
        const match = content.match(/<h1>Card Jira<\/h1>\s*<a [^>]*href="[^"]+\/browse\/([A-Z]+-\d+)/);
        if (match) {
            cardJiraId = match[1];
        }
        const title = cardJiraId ? `${titleBase} (${cardJiraId})` : titleBase;
        // Remove bloco <csp:parameters> do conteúdo antes de enviar
        let contentToSend = content.replace(/<csp:parameters[\s\S]*?<\/csp:parameters>\s*/g, '');
        const payload = {
            spaceId,
            status: 'current',
            title,
            parentId,
            body: {
                representation: BodyFormat.STORAGE,
                value: contentToSend
            }
        };
        const url = `${this.baseUrl}/api/v2/pages`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const pageData = await resp.json();
        const pageId = pageData.id;
        // Processa imagens locais e atualiza o conteúdo se necessário
        if (pageId) {
            const pasta = path.dirname(filePath);
            const contentWithImages = await this._processImagesInContent(contentToSend, pageId, pasta);
            if (contentWithImages !== contentToSend) {
                // Atualiza a página com o novo conteúdo
                const updatePayload = {
                    id: pageId,
                    status: 'current',
                    title,
                    spaceId,
                    body: {
                        representation: BodyFormat.STORAGE,
                        value: contentWithImages
                    },
                    version: {
                        number: 2
                    }
                };
                const updateUrl = `${this.baseUrl}/api/v2/pages/${pageId}`;
                const updateResp = await fetch(updateUrl, {
                    method: 'PUT',
                    headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });
                if (!updateResp.ok) {
                    throw new Error(await updateResp.text());
                }
            }
            // Remove todas as labels e propriedades antes de adicionar as do arquivo
            await this.applyLabelsAndPropertiesFromFile(pageId, labelsList, propriedades);
        }
        return pageData;
    }
    async updatePageFromFile(filePath) {
        const config = vscode.workspace.getConfiguration('confluenceSmartPublisher');
        let content = fs.readFileSync(filePath, 'utf-8');
        content = content.replace(/\n +/g, '\n');
        const match = content.match(/<csp:file_id>(.*?)<\/csp:file_id>/);
        if (!match) {
            throw new Error('Tag <csp:file_id> não encontrada no arquivo.');
        }
        const pageId = match[1].trim();
        if (!/^\d+$/.test(pageId)) {
            throw new Error(`ID da página inválido na tag <csp:file_id>: ${pageId}`);
        }
        let contentToSend = content.replace(/<csp:parameters[\s\S]*?<\/csp:parameters>\s*/g, '');
        const pasta = path.dirname(filePath);
        contentToSend = await this._processImagesInContent(contentToSend, pageId, pasta);
        const page = await this.getPageById(pageId);
        if (!page) {
            throw new Error(`Página com ID ${pageId} não encontrada.`);
        }
        const spaceId = page.spaceId;
        if (!spaceId) {
            throw new Error(`spaceId não encontrado para a página ${pageId}`);
        }
        const title = page.title;
        const version = page.version?.number || 1;
        const labelsList = this.extrairLista('csp:labels_list', content);
        const propriedades = this.extrairPropriedades(content);
        const payload = {
            id: pageId,
            status: 'current',
            title,
            spaceId,
            body: {
                representation: BodyFormat.STORAGE,
                value: contentToSend
            },
            version: {
                number: version + 1
            }
        };
        const url = `${this.baseUrl}/api/v2/pages/${pageId}`;
        const resp = await fetch(url, {
            method: 'PUT',
            headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        // Remove todas as labels e propriedades antes de adicionar as do arquivo
        await this.applyLabelsAndPropertiesFromFile(pageId, labelsList, propriedades);
        return await resp.json();
    }
    async setPageLabels(pageId, labels) {
        const { default: fetch } = await import('node-fetch');
        if (!Array.isArray(labels) || !labels.every(l => typeof l === 'string')) {
            throw new Error('labels deve ser uma lista de strings');
        }
        const payload = labels.map(label => ({ prefix: 'global', name: label }));
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/label`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        return await resp.json();
    }
    async getContentProperties(pageId) {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/property`;
        const resp = await fetch(url, { headers: this.getAuthHeader() });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const data = await resp.json();
        return data.results || [];
    }
    async updateContentProperty(pageId, key, value) {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/property/${key}`;
        // Buscar a versão atual da propriedade (se existir)
        let versionNumber = 1;
        const respGet = await fetch(url, { headers: this.getAuthHeader() });
        if (respGet.status === 200) {
            const prop = await respGet.json();
            versionNumber = (prop.version?.number || 1) + 1;
        }
        const payload = {
            key,
            value,
            version: { number: versionNumber }
        };
        const resp = await fetch(url, {
            method: 'PUT',
            headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        return await resp.json();
    }
}
exports.ConfluenceClient = ConfluenceClient;
async function publishConfluenceFile(filePath) {
    const fsPromises = fs.promises;
    function extrairFileId(conteudo) {
        const match = conteudo.match(/<csp:file_id>(.*?)<\/csp:file_id>/);
        return match ? match[1].trim() : null;
    }
    async function inserirFileIdNoArquivo(filePath, fileId) {
        let conteudo = await fsPromises.readFile(filePath, 'utf-8');
        conteudo = conteudo.replace(/<csp:file_id>.*?<\/csp:file_id>\s*/s, '');
        conteudo = `<csp:file_id>${fileId}</csp:file_id>\n` + conteudo;
        await fsPromises.writeFile(filePath, conteudo, { encoding: 'utf-8' });
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    let conteudo = await fsPromises.readFile(filePath, 'utf-8');
    const fileId = extrairFileId(conteudo);
    const client = new ConfluenceClient();
    let pageId;
    let resposta;
    if (fileId) {
        resposta = await client.updatePageFromFile(filePath);
        pageId = fileId;
    }
    else {
        resposta = await client.createPageFromFile(filePath);
        pageId = resposta.id;
        if (!pageId) {
            throw new Error('Não foi possível obter o ID da página criada.');
        }
        await inserirFileIdNoArquivo(filePath, pageId);
    }
    // Adiciona labels obrigatórias
    const labels = ['user-story', 'escopo', 'pendente'];
    await client.setPageLabels(pageId, labels);
    // Atualiza propriedades obrigatórias
    await client.updateContentProperty(pageId, 'content-appearance-published', 'fixed-width');
    await client.updateContentProperty(pageId, 'content-appearance-draft', 'fixed-width');
    return { pageId, resposta };
}
//# sourceMappingURL=confluenceClient.js.map