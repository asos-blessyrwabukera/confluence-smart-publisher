import { workspace } from 'vscode';
import { mkdirSync, writeFileSync, createReadStream, existsSync, readFileSync, promises as fsPromises } from 'fs';
import { isAbsolute, join, dirname, basename, extname } from 'path';
import FormData from 'form-data';
// @ts-ignore
import xmlEscape from 'xml-escape';
import { decodeHtmlEntities } from './confluenceFormatter';

export enum BodyFormat {
    VIEW = 'view',
    EXPORT_VIEW = 'export_view',
    STYLED_VIEW = 'styled_view',
    STORAGE = 'storage',
    EDITOR = 'editor',
    ATLAS_DOC_FORMAT = 'atlas_doc_format',
    ANONYMOUS_EXPORT_VIEW = 'anonymous_export_view',
}

export class ConfluenceClient {
    private baseUrl: string;
    private username: string;
    private apiToken: string;

    constructor() {
        // Preferencialmente, use as configurações do VSCode para armazenar as credenciais
        const config = workspace.getConfiguration('confluenceSmartPublisher');
        this.baseUrl = (config.get('baseUrl') as string)?.replace(/\/$/, '') || '';
        this.username = config.get('username') as string || '';
        this.apiToken = config.get('apiToken') as string || '';
        if (!this.baseUrl || !this.username || !this.apiToken) {
            throw new Error('Configure baseUrl, username and apiToken in the extension settings.');
        }
    }

    private getAuthHeader() {
        const token = Buffer.from(`${this.username}:${this.apiToken}`).toString('base64');
        return { 'Authorization': `Basic ${token}` };
    }

    async getPageByTitle(spaceKey: string, title: string): Promise<any | null> {
        const { default: fetch } = await import('node-fetch');
        const url = `${this.baseUrl}/api/v2/pages?spaceKey=${encodeURIComponent(spaceKey)}&title=${encodeURIComponent(title)}&expand=body.${BodyFormat.STORAGE},version,space`;
        const resp = await fetch(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
        if (!resp.ok) {throw new Error(await resp.text());}
        const data = await resp.json() as any;
        return data.results?.[0] || null;
    }

    async getPageById(pageId: string, bodyFormat: BodyFormat = BodyFormat.STORAGE): Promise<any | null> {
        const { default: fetch } = await import('node-fetch');
        const url = `${this.baseUrl}/api/v2/pages/${pageId}?body-format=${bodyFormat}`;
        const resp = await fetch(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
        if (resp.status === 404) {return null;}
        if (!resp.ok) {throw new Error(await resp.text());}
        return await resp.json() as any;
    }

    async getAllPagesInSpace(spaceId: string): Promise<any[]> {
        const { default: fetch } = await import('node-fetch');
        const allPages: any[] = [];
        let cursor: string | null = null;
        const limit = 250; // Maximum allowed by API
        
        do {
            let url = `${this.baseUrl}/api/v2/pages?space-id=${encodeURIComponent(spaceId)}&limit=${limit}&expand=body.${BodyFormat.STORAGE},version,space`;
            if (cursor) {
                url += `&cursor=${encodeURIComponent(cursor)}`;
            }
            
            const resp = await fetch(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
            if (!resp.ok) {
                throw new Error(`Failed to get pages from space ${spaceId}: ${await resp.text()}`);
            }
            
            const data = await resp.json() as any;
            if (data.results && Array.isArray(data.results)) {
                allPages.push(...data.results);
            }
            
            cursor = data._links?.next ? data._links.next.split('cursor=')[1]?.split('&')[0] : null;
        } while (cursor);
        
        return allPages;
    }

    async downloadSpacePages(spaceId: string, outputDir: string = 'Downloaded', bodyFormat: BodyFormat = BodyFormat.STORAGE): Promise<string[]> {
        const pages = await this.getAllPagesInSpace(spaceId);
        const downloadedFiles: string[] = [];
        
        if (pages.length === 0) {
            throw new Error(`No pages found in space with ID: ${spaceId}`);
        }
        
        // Create space directory
        let baseDir: string;
        if (isAbsolute(outputDir)) {
            baseDir = outputDir;
        } else {
            const workspaceFolders = workspace.workspaceFolders;
            baseDir = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();
            baseDir = join(baseDir, outputDir);
        }
        
        // Use the first page's space key for the directory name
        const spaceKey = pages[0].spaceId || spaceId;
        const spaceDir = join(baseDir, `space_${spaceKey}`);
        
        for (const page of pages) {
            try {
                const filePath = await this.downloadConfluencePage(page.id, bodyFormat, spaceDir);
                downloadedFiles.push(filePath);
            } catch (error: any) {
                // Skip pages that fail to download and continue with others
            }
        }
        
        return downloadedFiles;
    }

    async downloadConfluencePage(pageId: string, bodyFormat: BodyFormat = BodyFormat.STORAGE, outputDir: string = 'Downloaded'): Promise<string> {
        const { default: fetch } = await import('node-fetch');
        const page = await this.getPageById(pageId, bodyFormat);
        if (!page) {throw new Error(`Page with ID ${pageId} not found.`);}
        const formato = bodyFormat;
        let conteudo: string;
        try {
            conteudo = page.body?.[formato]?.value;
            // Decodifica entidades HTML se o parâmetro estiver ativado
            const config = workspace.getConfiguration('confluenceSmartPublisher');
            if (config.get('htmlEntitiesDecode', false)) {
                conteudo = decodeHtmlEntities(conteudo);
            }
        } catch {
            throw new Error(`Content body.${formato}.value not found in API response.`);
        }
        const titulo = page.title || `${formato}_${pageId}`;
        const tituloSanitizado = titulo.replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `${tituloSanitizado}.confluence`;
        let baseDir: string;
        if (isAbsolute(outputDir)) {
            baseDir = outputDir;
        } else {
            const workspaceFolders = workspace.workspaceFolders;
            baseDir = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();
            baseDir = join(baseDir, outputDir);
        }
        const filePath = join(baseDir, fileName);
        mkdirSync(dirname(filePath), { recursive: true });

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
                    labelsList = data.results.map((l: any) => l.name).join(',');
                }
            }
        } catch {}
        // 4. properties
        let propertiesXml = '';
        try {
            const props = await this.getContentProperties(pageId);
            if (props.length > 0) {
                const keys: string[] = [];
                const values: string[] = [];
                for (const prop of props) {
                    if (prop.key && prop.value !== undefined) {
                        keys.push(xmlEscape(String(prop.key)));
                        // value pode ser objeto ou string
                        let val = typeof prop.value === 'object' ? JSON.stringify(prop.value) : String(prop.value);
                        values.push(xmlEscape(val));
                    }
                }
                propertiesXml = `<csp:properties>\n`;
                for (let i = 0; i < keys.length; i++) {
                    propertiesXml += `  <csp:key>${keys[i]}</csp:key>\n  <csp:value>${values[i]}</csp:value>\n`;
                }
                propertiesXml += `</csp:properties>\n`;
            } else {
                propertiesXml = `<csp:properties>\n  <csp:key></csp:key>\n  <csp:value></csp:value>\n</csp:properties>\n`;
            }
        } catch {
            propertiesXml = `<csp:properties>\n  <csp:key></csp:key>\n  <csp:value></csp:value>\n</csp:properties>\n`;
        }
        // Monta o bloco completo
        const cspBlock =
            `<csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">\n` +
            `  <csp:file_id>${xmlEscape(String(fileId))}</csp:file_id>\n` +
            `  <csp:labels_list>${xmlEscape(labelsList)}</csp:labels_list>\n` +
            `  <csp:parent_id>${xmlEscape(String(parentId))}</csp:parent_id>\n` +
                propertiesXml +
            `</csp:parameters>\n`;

        // Junta o bloco csp com o conteúdo da página
        let conteudoFinal = cspBlock + '\n' + conteudo;
        writeFileSync(filePath, conteudoFinal, { encoding: 'utf-8' });
        return filePath;
    }

    async uploadAttachment(pageId: string, filePath: string): Promise<string | null> {
        const { default: fetch } = await import('node-fetch');
        // Descobre a base da URL para API v1
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const fileName = basename(filePath);
        // Verifica se o anexo já existe
        const checkUrl = `${baseUrlV1}/rest/api/content/${pageId}/child/attachment?filename=${encodeURIComponent(fileName)}`;
        let resp = await fetch(checkUrl, { headers: this.getAuthHeader() });
        if (!resp.ok) {throw new Error(await resp.text());}
        const results = (await resp.json() as any).results || [];
        if (results.length > 0) {
            const downloadLink = results[0]._links.download;
            return downloadLink.startsWith('/') ? baseUrlV1 + downloadLink : downloadLink;
        }
        // Upload
        const url = `${baseUrlV1}/rest/api/content/${pageId}/child/attachment`;
        const form = new FormData();
        form.append('file', createReadStream(filePath), fileName);
        resp = await fetch(url, {
            method: 'POST',
            headers: { ...this.getAuthHeader(), 'X-Atlassian-Token': 'no-check' },
            body: form as any
        });
        if (!resp.ok) {throw new Error(await resp.text());}
        const uploadResults = (await resp.json() as any).results || [];
        if (uploadResults.length > 0) {
            const downloadLink = uploadResults[0]._links.download;
            return downloadLink.startsWith('/') ? baseUrlV1 + downloadLink : downloadLink;
        }
        return null;
    }

    private async _processImagesInContent(content: string, pageId: string, baseDir: string): Promise<string> {
        // Substitui <img src="..."> por links de anexo
        const imgTagRegex = /<img\b[^>]*\bsrc=["']([^"']+)["']/g;
        const replaceImgSrc = async (match: string, src: string) => {
            if (src.startsWith('http://') || src.startsWith('https://')) {
                return match; // Não altera URLs absolutas
            }
            const imgPath = join(baseDir, src);
            if (!existsSync(imgPath)) {
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
        let matchArr: RegExpExecArray | null;
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
            const imgPath = join(baseDir, filename);
            if (existsSync(imgPath)) {
                await this.uploadAttachment(pageId, imgPath);
            }
            acResult += matchArr[0];
            lastIndex = acImageRegex.lastIndex;
        }
        acResult += content.slice(lastIndex);
        return acResult;
    }

    // Remove todas as labels da página
    async removeAllLabels(pageId: string): Promise<void> {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/label`;
        const resp = await fetch(url, { headers: this.getAuthHeader() });
        if (!resp.ok) { throw new Error(await resp.text()); }
        const data = await resp.json();
        if (Array.isArray(data.results)) {
            for (const label of data.results) {
                const labelName = label.name;
                const deleteUrl = `${baseUrlV1}/rest/api/content/${pageId}/label?name=${encodeURIComponent(labelName)}`;
                const delResp = await fetch(deleteUrl, { method: 'DELETE', headers: this.getAuthHeader() });
                if (!delResp.ok) { throw new Error(await delResp.text()); }
            }
        }
    }

    // Remove todas as propriedades da página
    async removeAllProperties(pageId: string): Promise<void> {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const props = await this.getContentProperties(pageId);
        for (const prop of props) {
            if (prop.key) {
                const url = `${baseUrlV1}/rest/api/content/${pageId}/property/${encodeURIComponent(prop.key)}`;
                const delResp = await fetch(url, { method: 'DELETE', headers: this.getAuthHeader() });
                if (!delResp.ok && delResp.status !== 404) { throw new Error(await delResp.text()); }
            }
        }
    }

    // Aplica as labels e propriedades do arquivo, removendo todas as existentes antes
    private async applyLabelsAndPropertiesFromFile(pageId: string, labelsList: string[], propriedades: { key: string, value: string }[]) {
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
    private extractTag(tag: string, content: string): string | null {
        const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
        const match = content.match(regex);
        return match ? match[1] : null;
    }

    private extractList(tag: string, content: string): string[] {
        const value = this.extractTag(tag, content);
        return value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
    }

    private extractProperties(content: string): { key: string, value: string }[] {
        const props: { key: string, value: string }[] = [];
        const regex = /<csp:properties>([\s\S]*?)<\/csp:properties>/g;
        const match = regex.exec(content);
        if (!match) {return props;}

        const propContent = match[1];
        const keyRegex = /<csp:key>(.*?)<\/csp:key>\s*<csp:value>(.*?)<\/csp:value>/g;
        let keyMatch;
        while ((keyMatch = keyRegex.exec(propContent)) !== null) {
            const key = keyMatch[1].trim();
            const value = keyMatch[2].trim();
            if (key) {
                props.push({ key, value });
            }
        }
        return props;
    }

    async createPageFromFile(filePath: string): Promise<any> {
        const config = workspace.getConfiguration('confluenceSmartPublisher');
        const pasta = dirname(filePath);
        const parentFile = join(pasta, '.parent');
        let content = readFileSync(filePath, 'utf-8');

        content = content.replace(/\n +/g, '\n');

        // Extrair informações
        const parentId = this.extractTag('csp:parent_id', content);
        if (!parentId || !/^[0-9]+$/.test(parentId)) {
            throw new Error(`Invalid or missing parentId in <csp:parent_id> tag: ${parentId}`);
        }
        const labelsList = this.extractList('csp:labels_list', content);
        const properties = this.extractProperties(content);

        // Obter spaceId a partir do parentId
        const parentPage = await this.getPageById(parentId);
        if (!parentPage || !parentPage.spaceId) {
            throw new Error(`Could not get spaceId for parentId ${parentId}`);
        }
        const spaceId = parentPage.spaceId;

        // Título
        const titleBase = basename(filePath, extname(filePath));
        let cardJiraId: string | null = null;
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
        if (!resp.ok) {throw new Error(await resp.text());}
        const pageData = await resp.json() as any;
        const pageId = pageData.id;
        // Processa imagens locais e atualiza o conteúdo se necessário
        if (pageId) {
            const pasta = dirname(filePath);
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
                if (!updateResp.ok) {throw new Error(await updateResp.text());}
            }
            // Remove todas as labels e propriedades antes de adicionar as do arquivo
            await this.applyLabelsAndPropertiesFromFile(pageId, labelsList, properties);
        }
        return pageData;
    }

    async updatePageFromFile(filePath: string): Promise<any> {
        const config = workspace.getConfiguration('confluenceSmartPublisher');
        let content = readFileSync(filePath, 'utf-8');

        content = content.replace(/\n +/g, '\n');
        const match = content.match(/<csp:file_id>(.*?)<\/csp:file_id>/);
        if (!match) {throw new Error('Tag <csp:file_id> not found in file.');}
        const pageId = match[1].trim();
        if (!/^\d+$/.test(pageId)) {throw new Error(`Invalid page ID in <csp:file_id> tag: ${pageId}`);}
        let contentToSend = content.replace(/<csp:parameters[\s\S]*?<\/csp:parameters>\s*/g, '');

        const pasta = dirname(filePath);
        contentToSend = await this._processImagesInContent(contentToSend, pageId, pasta);
        const page = await this.getPageById(pageId);
        if (!page) {throw new Error(`Page with ID ${pageId} not found.`);}
        const spaceId = page.spaceId;
        if (!spaceId) {throw new Error(`spaceId not found for page ${pageId}`);}
        const title = page.title;
        const version = page.version?.number || 1;
        const labelsList = this.extractList('csp:labels_list', content);
        const properties = this.extractProperties(content);
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
        if (!resp.ok) {throw new Error(await resp.text());}
        // Remove todas as labels e propriedades antes de adicionar as do arquivo
        await this.applyLabelsAndPropertiesFromFile(pageId, labelsList, properties);
        return await resp.json();
    }

    async setPageLabels(pageId: string, labels: string[]): Promise<any> {
        const { default: fetch } = await import('node-fetch');
        if (!Array.isArray(labels) || !labels.every(l => typeof l === 'string')) {
            throw new Error('labels must be a list of strings');
        }
        const payload = labels.map(label => ({ prefix: 'global', name: label }));
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/label`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {throw new Error(await resp.text());}
        return await resp.json();
    }

    async getContentProperties(pageId: string): Promise<any[]> {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/property`;
        const resp = await fetch(url, { headers: this.getAuthHeader() });
        if (!resp.ok) {throw new Error(await resp.text());}
        const data = await resp.json() as any;
        return data.results || [];
    }

    async updateContentProperty(pageId: string, key: string, value: any): Promise<any> {
        const { default: fetch } = await import('node-fetch');
        let baseUrlV1 = this.baseUrl.includes('/api/v2') ? this.baseUrl.split('/api/v2')[0] : this.baseUrl;
        const url = `${baseUrlV1}/rest/api/content/${pageId}/property/${key}`;
        // Buscar a versão atual da propriedade (se existir)
        let versionNumber = 1;
        const respGet = await fetch(url, { headers: this.getAuthHeader() });
        if (respGet.status === 200) {
            const prop = await respGet.json() as any;
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
        if (!resp.ok) {throw new Error(await resp.text());}
        return await resp.json();
    }
}

export async function publishConfluenceFile(filePath: string) {
    function extractFileId(conteudo: string): string | null {
        const regex = /<csp:file_id>(\d+)<\/csp:file_id>/;
        const match = conteudo.match(regex);
        return match ? match[1] : null;
    }

    async function insertFileIdInFile(filePath: string, fileId: string) {
        let conteudo = await fsPromises.readFile(filePath, 'utf-8');
        
        // Verifica se existe a estrutura do CSP
        const cspRegex = /<csp:parameters[\s\S]*?<\/csp:parameters>/;
        const cspMatch = conteudo.match(cspRegex);
        
        if (cspMatch) {
            // Se existe a estrutura do CSP, remove a tag file_id existente e insere a nova
            conteudo = conteudo.replace(/<csp:file_id>.*?<\/csp:file_id>\s*/s, '');
            const cspContent = cspMatch[0];
            const newCspContent = cspContent.replace(
                /<csp:parameters[^>]*>/,
                `$&<csp:file_id>${fileId}</csp:file_id>\n`
            );
            conteudo = conteudo.replace(cspRegex, newCspContent);
        } else {
            // Se não existe a estrutura do CSP, cria uma nova
            const cspBlock = `<csp:parameters xmlns:csp="https://confluence.smart.publisher/csp">\n` +
                `  <csp:file_id>${fileId}</csp:file_id>\n` +
                `  <csp:labels_list></csp:labels_list>\n` +
                `  <csp:parent_id></csp:parent_id>\n` +
                `  <csp:properties>\n` +
                `    <csp:key>content-appearance-published</csp:key>\n` +
                `    <csp:value>fixed-width</csp:value>\n` +
                `    <csp:key>content-appearance-draft</csp:key>\n` +
                `    <csp:value>fixed-width</csp:value>\n` +
                `  </csp:properties>\n` +
                `</csp:parameters>\n\n`;
            conteudo = cspBlock + conteudo;
        }
        
        await fsPromises.writeFile(filePath, conteudo, { encoding: 'utf-8' });
    }

    async function updatePropertiesInFile(filePath: string) {
        let conteudo = await fsPromises.readFile(filePath, 'utf-8');
        const cspRegex = /<csp:parameters[\s\S]*?<\/csp:parameters>/;
        const cspMatch = conteudo.match(cspRegex);
        
        if (cspMatch) {
            const cspContent = cspMatch[0];
            const propertiesRegex = /<csp:properties>[\s\S]*?<\/csp:properties>/;
            const propertiesMatch = cspContent.match(propertiesRegex);
            
            if (propertiesMatch) {
                // Verifica se as propriedades já existem
                let propertiesContent = propertiesMatch[0];
                const requiredProperties = [
                    { key: 'content-appearance-published', value: 'fixed-width' },
                    { key: 'content-appearance-draft', value: 'fixed-width' }
                ];
                
                let hasChanges = false;
                for (const prop of requiredProperties) {
                    const keyRegex = new RegExp(`<csp:key>${prop.key}</csp:key>\\s*<csp:value>([^<]*)</csp:value>`);
                    const keyMatch = propertiesContent.match(keyRegex);
                    
                    if (!keyMatch) {
                        // Se a propriedade não existe, adiciona ela
                        hasChanges = true;
                        propertiesContent = propertiesContent.replace(
                            '</csp:properties>',
                            `    <csp:key>${prop.key}</csp:key>\n    <csp:value>${prop.value}</csp:value>\n  </csp:properties>`
                        );
                    }
                    // Se a propriedade já existe, mantém o valor original
                }
                
                // Atualiza o conteúdo do arquivo apenas se houver mudanças
                if (hasChanges) {
                    conteudo = conteudo.replace(propertiesRegex, propertiesContent);
                    await fsPromises.writeFile(filePath, conteudo, { encoding: 'utf-8' });
                }
            } else {
                // Adiciona o bloco de propriedades se não existir
                const newProperties = `  <csp:properties>\n` +
                    `    <csp:key>content-appearance-published</csp:key>\n` +
                    `    <csp:value>fixed-width</csp:value>\n` +
                    `    <csp:key>content-appearance-draft</csp:key>\n` +
                    `    <csp:value>fixed-width</csp:value>\n` +
                    `  </csp:properties>\n`;
                conteudo = conteudo.replace(
                    /<csp:parameters[^>]*>/,
                    `$&${newProperties}`
                );
                await fsPromises.writeFile(filePath, conteudo, { encoding: 'utf-8' });
            }
        }
    }

    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    // Atualiza as propriedades no arquivo local antes da publicação
    await updatePropertiesInFile(filePath);

    let conteudo = await fsPromises.readFile(filePath, 'utf-8');
    const fileId = extractFileId(conteudo);
    const client = new ConfluenceClient();
    let pageId: string;
    let resposta: any;
    if (fileId) {
        resposta = await client.updatePageFromFile(filePath);
        pageId = fileId;
    } else {
        resposta = await client.createPageFromFile(filePath);
        pageId = resposta.id;
        if (!pageId) {throw new Error('Could not get the ID of the created page.');}
        await insertFileIdInFile(filePath, pageId);
    }
    return { pageId, resposta };
} 