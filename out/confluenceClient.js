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
const node_fetch_1 = __importDefault(require("node-fetch"));
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const form_data_1 = __importDefault(require("form-data"));
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
        const url = `${this.baseUrl}/api/v2/pages?spaceKey=${encodeURIComponent(spaceKey)}&title=${encodeURIComponent(title)}&expand=body.storage,version,space`;
        const resp = await (0, node_fetch_1.default)(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const data = await resp.json();
        return data.results?.[0] || null;
    }
    async getPageById(pageId, bodyFormat = BodyFormat.STORAGE) {
        const url = `${this.baseUrl}/api/v2/pages/${pageId}?body-format=${bodyFormat}`;
        const resp = await (0, node_fetch_1.default)(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
        if (resp.status === 404) {
            return null;
        }
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        return await resp.json();
    }
    async downloadConfluencePage(pageId, bodyFormat = BodyFormat.STORAGE, outputDir = 'Baixados') {
        const page = await this.getPageById(pageId, bodyFormat);
        if (!page) {
            throw new Error(`Página com ID ${pageId} não encontrada.`);
        }
        const formato = bodyFormat;
        let conteudo;
        try {
            conteudo = page.body?.[formato]?.value;
        }
        catch {
            throw new Error(`Conteúdo body.${formato}.value não encontrado na resposta da API.`);
        }
        // Substitui entidades HTML por caracteres legíveis
        conteudo = this.htmlUnescape(conteudo);
        // Obtém o título da página e sanitiza para nome de arquivo
        const titulo = page.title || `${formato}_${pageId}`;
        const tituloSanitizado = titulo.replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `${tituloSanitizado}.confluence`;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let baseDir = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();
        const filePath = path.join(baseDir, outputDir, fileName);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        // Adiciona a tag <file_id> no início do conteúdo
        const conteudoComId = `<file_id>${pageId}</file_id>\n` + conteudo;
        fs.writeFileSync(filePath, conteudoComId, { encoding: 'utf-8' });
        return filePath;
    }
    async uploadAttachment(pageId, filePath) {
        // Descobre a base da URL para API v1
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const fileName = path.basename(filePath);
        // Verifica se o anexo já existe
        const checkUrl = `${baseUrlV1}/rest/api/content/${pageId}/child/attachment?filename=${encodeURIComponent(fileName)}`;
        let resp = await (0, node_fetch_1.default)(checkUrl, { headers: this.getAuthHeader() });
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
        resp = await (0, node_fetch_1.default)(url, {
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
    htmlUnescape(str) {
        // Simples substituição de entidades HTML comuns
        return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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
    async createPageFromFile(filePath) {
        const pasta = path.dirname(filePath);
        const parentFile = path.join(pasta, '.parent');
        if (!fs.existsSync(parentFile)) {
            throw new Error(`Arquivo .parent não encontrado em ${pasta}`);
        }
        const parentId = fs.readFileSync(parentFile, 'utf-8').trim();
        if (!/^[0-9]+$/.test(parentId)) {
            throw new Error(`parentId inválido no arquivo .parent: ${parentId}`);
        }
        const parentPage = await this.getPageById(parentId);
        if (!parentPage || !parentPage.spaceId) {
            throw new Error(`Não foi possível obter spaceId para parentId ${parentId}`);
        }
        const spaceId = parentPage.spaceId;
        let content = fs.readFileSync(filePath, 'utf-8');
        content = content.replace(/\n +/g, '\n');
        const titleBase = path.basename(filePath, path.extname(filePath));
        let cardJiraId = null;
        const match = content.match(/<h1>Card Jira<\/h1>\s*<a [^>]*href="[^"]+\/browse\/([A-Z]+-\d+)/);
        if (match) {
            cardJiraId = match[1];
        }
        const title = cardJiraId ? `${titleBase} (${cardJiraId})` : titleBase;
        const payload = {
            spaceId,
            status: 'current',
            title,
            parentId,
            body: {
                representation: 'storage',
                value: content
            }
        };
        const url = `${this.baseUrl}/api/v2/pages`;
        const resp = await (0, node_fetch_1.default)(url, {
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
            const contentWithImages = await this._processImagesInContent(content, pageId, pasta);
            if (contentWithImages !== content) {
                // Atualiza a página com o novo conteúdo
                const updatePayload = {
                    id: pageId,
                    status: 'current',
                    title,
                    spaceId,
                    body: {
                        representation: 'storage',
                        value: contentWithImages
                    },
                    version: {
                        number: 2
                    }
                };
                const updateUrl = `${this.baseUrl}/api/v2/pages/${pageId}`;
                const updateResp = await (0, node_fetch_1.default)(updateUrl, {
                    method: 'PUT',
                    headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });
                if (!updateResp.ok) {
                    throw new Error(await updateResp.text());
                }
                return await updateResp.json();
            }
        }
        return pageData;
    }
    async updatePageFromFile(filePath) {
        let content = fs.readFileSync(filePath, 'utf-8');
        content = content.replace(/\n +/g, '\n');
        const match = content.match(/<file_id>(.*?)<\/file_id>/);
        if (!match) {
            throw new Error('Tag <file_id> não encontrada no arquivo.');
        }
        const pageId = match[1].trim();
        if (!/^[0-9]+$/.test(pageId)) {
            throw new Error(`ID da página inválido na tag <file_id>: ${pageId}`);
        }
        let contentToSend = content.replace(/<file_id>.*?<\/file_id>/s, '');
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
        const payload = {
            id: pageId,
            status: 'current',
            title,
            spaceId,
            body: {
                representation: 'storage',
                value: contentToSend
            },
            version: {
                number: version + 1
            }
        };
        const url = `${this.baseUrl}/api/v2/pages/${pageId}`;
        const resp = await (0, node_fetch_1.default)(url, {
            method: 'PUT',
            headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        return await resp.json();
    }
    async setPageLabels(pageId, labels) {
        if (!Array.isArray(labels) || !labels.every(l => typeof l === 'string')) {
            throw new Error('labels deve ser uma lista de strings');
        }
        const payload = labels.map(label => ({ prefix: 'global', name: label }));
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/label`;
        const resp = await (0, node_fetch_1.default)(url, {
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
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/property`;
        const resp = await (0, node_fetch_1.default)(url, { headers: this.getAuthHeader() });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const data = await resp.json();
        return data.results || [];
    }
    async updateContentProperty(pageId, key, value) {
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/property/${key}`;
        // Buscar a versão atual da propriedade (se existir)
        let versionNumber = 1;
        const respGet = await (0, node_fetch_1.default)(url, { headers: this.getAuthHeader() });
        if (respGet.status === 200) {
            const prop = await respGet.json();
            versionNumber = (prop.version?.number || 1) + 1;
        }
        const payload = {
            key,
            value,
            version: { number: versionNumber }
        };
        const resp = await (0, node_fetch_1.default)(url, {
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
        const match = conteudo.match(/<file_id>(.*?)<\/file_id>/);
        return match ? match[1].trim() : null;
    }
    async function inserirFileIdNoArquivo(filePath, fileId) {
        let conteudo = await fsPromises.readFile(filePath, 'utf-8');
        conteudo = conteudo.replace(/<file_id>.*?<\/file_id>\s*/s, '');
        conteudo = `<file_id>${fileId}</file_id>\n` + conteudo;
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