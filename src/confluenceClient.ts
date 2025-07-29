import { workspace } from 'vscode';
import { mkdirSync, writeFileSync, createReadStream, existsSync, readFileSync, promises as fsPromises } from 'fs';
import { isAbsolute, join, dirname, basename, extname } from 'path';
import FormData = require('form-data');
import { decodeHtmlEntities } from './confluenceFormatter';
import { AdfToMarkdownConverter } from './adf-md-converter/adf-to-md-converter';
import { 
    createJSONCSPBlock, 
    extractProperties, 
    extractParentId, 
    extractLabels, 
    extractFileId, 
    createXMLCSPBlock, 
    createDefaultCSPProperties 
} from './csp-utils';

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

    private sanitizeFileName(title: string): string {
        return title.replace(/[\\/:*?"<>|]/g, '_');
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

    async getPageById(pageId: string, bodyFormat: BodyFormat = BodyFormat.ATLAS_DOC_FORMAT): Promise<any | null> {
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

    async getSpaceDetails(spaceId: string): Promise<any> {
        const { default: fetch } = await import('node-fetch');
        const url = `${this.baseUrl}/api/v2/spaces/${encodeURIComponent(spaceId)}`;
        const resp = await fetch(url, { headers: { ...this.getAuthHeader(), 'Content-Type': 'application/json' } });
        if (!resp.ok) {
            throw new Error(`Failed to get space details for ${spaceId}: ${await resp.text()}`);
        }
        return await resp.json() as any;
    }

    async downloadSpacePages(spaceId: string, outputDir: string = 'Downloaded', bodyFormat: BodyFormat = BodyFormat.ATLAS_DOC_FORMAT): Promise<string[]> {
        const pages = await this.getAllPagesInSpace(spaceId);
        const downloadedFiles: string[] = [];
        
        if (pages.length === 0) {
            throw new Error(`No pages found in space with ID: ${spaceId}`);
        }
        
        // Get space details for proper naming
        const spaceDetails = await this.getSpaceDetails(spaceId);
        const spaceName = spaceDetails.name || `space_${spaceId}`;
        
        // Create space directory
        let baseDir: string;
        if (isAbsolute(outputDir)) {
            baseDir = outputDir;
        } else {
            const workspaceFolders = workspace.workspaceFolders;
            baseDir = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();
            baseDir = join(baseDir, outputDir);
        }
        
        // Use space name for the directory
        const sanitizedSpaceName = this.sanitizeFileName(spaceName);
        const spaceDir = join(baseDir, sanitizedSpaceName);
        
        // Create space metadata file
        mkdirSync(spaceDir, { recursive: true });
        const spaceMetadata = {
            spaceId: spaceId,
            spaceName: spaceName,
            downloadedAt: new Date().toISOString(),
            structure: 'flat'
        };
        
        const metadataPath = join(spaceDir, '.space-metadata.json');
        writeFileSync(metadataPath, JSON.stringify(spaceMetadata, null, 2), 'utf-8');
        
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

    async downloadSpacePagesHierarchical(spaceId: string, outputDir: string = 'Downloaded', bodyFormat: BodyFormat = BodyFormat.ATLAS_DOC_FORMAT): Promise<string[]> {
        const pages = await this.getAllPagesInSpace(spaceId);
        const downloadedFiles: string[] = [];
        
        if (pages.length === 0) {
            throw new Error(`No pages found in space with ID: ${spaceId}`);
        }
        
        // Get space details for proper naming
        const spaceDetails = await this.getSpaceDetails(spaceId);
        const spaceName = spaceDetails.name || `space_${spaceId}`;
        
        // Create space directory
        let baseDir: string;
        if (isAbsolute(outputDir)) {
            baseDir = outputDir;
        } else {
            const workspaceFolders = workspace.workspaceFolders;
            baseDir = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();
            baseDir = join(baseDir, outputDir);
        }
        
        // Use space name for the directory
        const sanitizedSpaceName = this.sanitizeFileName(spaceName);
        const spaceDir = join(baseDir, sanitizedSpaceName);
        
        // Build hierarchy map
        const pageMap = new Map<string, any>();
        const children = new Map<string, any[]>();
        const rootPages: any[] = [];
        
        // First pass: Create page map and identify relationships
        for (const page of pages) {
            pageMap.set(page.id, page);
            if (!page.parentId) {
                rootPages.push(page);
            } else {
                if (!children.has(page.parentId)) {
                    children.set(page.parentId, []);
                }
                children.get(page.parentId)!.push(page);
            }
        }
        
        // Helper function to build directory path for a page
        const buildPagePath = (page: any, currentPath: string = spaceDir): string => {
            if (!page.parentId) {
                return currentPath;
            }
            
            const parent = pageMap.get(page.parentId);
            if (!parent) {
                // Orphaned page - place in root
                return currentPath;
            }
            
            const parentPath = buildPagePath(parent, currentPath);
            const parentDirName = this.sanitizeFileName(parent.title);
            return join(parentPath, parentDirName);
        };
        
        // Recursive function to download pages hierarchically
        const downloadPageHierarchy = async (page: any, currentPath: string): Promise<void> => {
            try {
                // Ensure directory exists
                mkdirSync(currentPath, { recursive: true });
                
                // Download the page to current directory
                const filePath = await this.downloadConfluencePage(page.id, bodyFormat, currentPath);
                downloadedFiles.push(filePath);
                
                // Process children
                const pageChildren = children.get(page.id) || [];
                if (pageChildren.length > 0) {
                    const pageDirName = this.sanitizeFileName(page.title);
                    const childPath = join(currentPath, pageDirName);
                    
                    for (const child of pageChildren) {
                        await downloadPageHierarchy(child, childPath);
                    }
                }
            } catch (error: any) {
                // Skip pages that fail to download and continue with others
                console.warn(`Failed to download page ${page.title} (ID: ${page.id}): ${error.message}`);
            }
        };
        
        // Download all root pages and their hierarchies
        for (const rootPage of rootPages) {
            await downloadPageHierarchy(rootPage, spaceDir);
        }
        
        // Handle orphaned pages (pages with parent IDs that don't exist)
        for (const page of pages) {
            if (page.parentId && !pageMap.has(page.parentId)) {
                try {
                    mkdirSync(spaceDir, { recursive: true });
                    const filePath = await this.downloadConfluencePage(page.id, bodyFormat, spaceDir);
                    downloadedFiles.push(filePath);
                } catch (error: any) {
                    console.warn(`Failed to download orphaned page ${page.title} (ID: ${page.id}): ${error.message}`);
                }
            }
        }
        
        return downloadedFiles;
    }

    async downloadConfluencePage(pageId: string, bodyFormat: BodyFormat = BodyFormat.ATLAS_DOC_FORMAT, outputDir: string = 'Downloaded'): Promise<string> {
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
        let propertiesArr: { key: string; value: string }[] = [];
        try {
            const props = await this.getContentProperties(pageId);
            if (props.length > 0) {
                for (const prop of props) {
                    if (prop.key && prop.value !== undefined) {
                        let val = typeof prop.value === 'object' ? JSON.stringify(prop.value) : String(prop.value);
                        propertiesArr.push({ key: String(prop.key), value: val });
                    }
                }
            }
        } catch {
            // Se não conseguir extrair propriedades, mantém array vazio
        }
        // Monta o objeto completo com metadados e conteúdo usando a função utilitária
        const cspMetadata = {
            file_id: String(fileId),
            labels_list: labelsList,
            parent_id: String(parentId),
            properties: propertiesArr
        };
        const contentParsed = (() => {
            try {
                return JSON.parse(conteudo);
            } catch {
                return conteudo; // fallback se não for JSON válido
            }
        })();
        const conteudoFinal = createJSONCSPBlock(cspMetadata, contentParsed);
        writeFileSync(filePath, conteudoFinal, { encoding: 'utf-8' });

        // NOVO: Converter para Markdown se for JSON ADF
        if (formato === BodyFormat.ATLAS_DOC_FORMAT) {
            try {
                const adfJson = JSON.parse(conteudo);
                const converter = new AdfToMarkdownConverter();
                const markdownBlock = await converter.convertNode(adfJson, 0, this.baseUrl);
                const markdown = markdownBlock.markdown;
                const mdFileName = `${tituloSanitizado}.md`;
                const mdFilePath = join(baseDir, mdFileName);
                writeFileSync(mdFilePath, markdown, { encoding: 'utf-8' });
            } catch (e) {
                // Se não for JSON válido, ignora a conversão
            }
        }
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

    private async extractProperties(content: string): Promise<{ key: string, value: string }[]> {
        return extractProperties(content);
    }

    async createPageFromFile(filePath: string): Promise<any> {
        const config = workspace.getConfiguration('confluenceSmartPublisher');
        const pasta = dirname(filePath);
        const parentFile = join(pasta, '.parent');
        let content = readFileSync(filePath, 'utf-8');

        content = content.replace(/\n +/g, '\n');

        // Extrair informações usando função utilitária
        const parentId = extractParentId(content);
        if (!parentId || !/^[0-9]+$/.test(parentId)) {
            throw new Error(`Invalid or missing parentId tag: ${parentId}`);
        }
        const labelsList = extractLabels(content);
        const properties = await this.extractProperties(content);

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
        const pageId = extractFileId(content);
        if (!pageId || !/^\d+$/.test(pageId)) {throw new Error(`Invalid or missing page ID in tag: ${pageId}`);}
        let contentToSend = content.replace(/<csp:parameters[\s\S]*?<\/csp:parameters>\s*/g, '');

        const pasta = dirname(filePath);
        contentToSend = await this._processImagesInContent(contentToSend, pageId, pasta);
        const page = await this.getPageById(pageId);
        if (!page) {throw new Error(`Page with ID ${pageId} not found.`);}
        const spaceId = page.spaceId;
        if (!spaceId) {throw new Error(`spaceId not found for page ${pageId}`);}
        const title = page.title;
        const version = page.version?.number || 1;
        const labelsList = extractLabels(content);
        const properties = await this.extractProperties(content);
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

    async function insertFileIdInFile(filePath: string, fileId: string) {
        let conteudo = await fsPromises.readFile(filePath, 'utf-8');
        
        // Verifica se existe a estrutura do CSP
        const cspRegex = /<csp:parameters[\s\S]*?<\/csp:parameters>/;
        const cspMatch = conteudo.match(cspRegex);
        
        if (cspMatch) {
            // Se existe a estrutura do CSP, remove a tag file_id existente e insere a nova
            conteudo = conteudo.replace(/<csp:file_id>[\s\S]*?<\/csp:file_id>\s*/, '');
            const cspContent = cspMatch[0];
            const newCspContent = cspContent.replace(
                /<csp:parameters[^>]*>/,
                `$&<csp:file_id>${fileId}</csp:file_id>\n`
            );
            conteudo = conteudo.replace(cspRegex, newCspContent);
        } else {
            // Se não existe a estrutura do CSP, cria uma nova usando a função utilitária
            const cspMetadata = {
                file_id: fileId,
                labels_list: '',
                parent_id: '',
                properties: createDefaultCSPProperties()
            };
            const cspBlock = createXMLCSPBlock(cspMetadata) + '\n\n';
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