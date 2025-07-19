import * as vscode from 'vscode';
import { ConfluenceClient, BodyFormat } from './confluenceClient';
import { join, basename } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';

export interface SpaceSyncChange {
    pageId: string;
    title: string;
    fileName: string;
    localVersion?: number;
    remoteVersion: number;
    localModified?: Date;
    remoteModified: Date;
    status: 'new' | 'modified' | 'deleted' | 'conflict' | 'unchanged';
    hasLocalChanges?: boolean;
}

export interface SpaceSyncResult {
    status: 'completed' | 'partial' | 'cancelled';
    changes: SpaceSyncChange[];
    summary: {
        downloaded: number;
        skipped: number;
        conflicts: number;
        errors: number;
    };
    backupPath?: string;
}

export enum SyncStrategy {
    ASK_USER = 'ask',           // Interactive - ask for each conflict
    REMOTE_WINS = 'remote',     // Always download latest from Confluence
    LOCAL_WINS = 'local',       // Keep local files unchanged
    BACKUP_AND_DOWNLOAD = 'backup' // Backup local files then download
}

export class SpaceSync {
    private client: ConfluenceClient;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.client = new ConfluenceClient();
        this.outputChannel = outputChannel;
    }

    /**
     * Analyzes differences between local space folder and remote Confluence space
     */
    async analyzeSpaceChanges(spaceId: string, localSpaceDir: string): Promise<SpaceSyncChange[]> {
        const changes: SpaceSyncChange[] = [];
        
        // Get all remote pages
        const remotePages = await this.client.getAllPagesInSpace(spaceId);
        this.outputChannel.appendLine(`[Space Sync] Found ${remotePages.length} pages in remote space`);
        
        // Get all local files
        const localFiles = this.getLocalConfluenceFiles(localSpaceDir);
        this.outputChannel.appendLine(`[Space Sync] Found ${localFiles.length} local files`);
        
        // Create maps for efficient lookup
        const localFileMap = new Map<string, string>(); // pageId -> filePath
        const remotePageMap = new Map<string, any>(); // pageId -> page
        
        // Parse local files to extract page IDs
        for (const filePath of localFiles) {
            try {
                const content = readFileSync(filePath, 'utf-8');
                const pageIdMatch = content.match(/<csp:file_id>(\d+)<\/csp:file_id>/);
                if (pageIdMatch) {
                    localFileMap.set(pageIdMatch[1], filePath);
                }
            } catch (error) {
                this.outputChannel.appendLine(`[Space Sync] Warning: Could not parse ${filePath}`);
            }
        }
        
        // Build remote page map
        for (const page of remotePages) {
            remotePageMap.set(page.id, page);
        }
        
        // Analyze each remote page
        for (const page of remotePages) {
            const pageId = page.id;
            const localFile = localFileMap.get(pageId);
            
            if (!localFile) {
                // New page in Confluence
                changes.push({
                    pageId,
                    title: page.title,
                    fileName: this.sanitizeFileName(page.title) + '.confluence',
                    remoteVersion: page.version?.number || 1,
                    remoteModified: new Date(page.version?.createdAt || Date.now()),
                    status: 'new'
                });
            } else {
                // Page exists locally - check for differences
                const localContent = readFileSync(localFile, 'utf-8');
                const localVersionMatch = localContent.match(/<csp:version>(\d+)<\/csp:version>/);
                const localVersion = localVersionMatch ? parseInt(localVersionMatch[1]) : 1;
                const remoteVersion = page.version?.number || 1;
                
                const localStat = statSync(localFile);
                const remoteModified = new Date(page.version?.createdAt || Date.now());
                
                let status: SpaceSyncChange['status'] = 'unchanged';
                let hasLocalChanges = false;
                
                if (remoteVersion > localVersion) {
                    status = 'modified';
                } else if (localStat.mtime > remoteModified) {
                    status = 'conflict';
                    hasLocalChanges = true;
                }
                
                if (status !== 'unchanged') {
                    changes.push({
                        pageId,
                        title: page.title,
                        fileName: basename(localFile),
                        localVersion,
                        remoteVersion,
                        localModified: localStat.mtime,
                        remoteModified,
                        status,
                        hasLocalChanges
                    });
                }
            }
        }
        
        // Check for locally deleted pages
        for (const [pageId, filePath] of localFileMap) {
            if (!remotePageMap.has(pageId)) {
                const fileName = basename(filePath);
                changes.push({
                    pageId,
                    title: fileName.replace('.confluence', ''),
                    fileName,
                    localVersion: 1,
                    remoteVersion: 0,
                    remoteModified: new Date(0),
                    status: 'deleted'
                });
            }
        }
        
        return changes;
    }

    /**
     * Synchronizes a space with user interaction for conflicts
     */
    async syncSpace(spaceId: string, localSpaceDir: string, strategy: SyncStrategy = SyncStrategy.ASK_USER): Promise<SpaceSyncResult> {
        const result: SpaceSyncResult = {
            status: 'completed',
            changes: [],
            summary: { downloaded: 0, skipped: 0, conflicts: 0, errors: 0 }
        };
        
        try {
            this.outputChannel.appendLine(`[Space Sync] Starting sync analysis for space ${spaceId}`);
            const changes = await this.analyzeSpaceChanges(spaceId, localSpaceDir);
            result.changes = changes;
            
            if (changes.length === 0) {
                vscode.window.showInformationMessage('Space is already up to date!');
                return result;
            }
            
            // Create backup if needed
            if (strategy === SyncStrategy.BACKUP_AND_DOWNLOAD) {
                result.backupPath = await this.createBackup(localSpaceDir);
                this.outputChannel.appendLine(`[Space Sync] Created backup at: ${result.backupPath}`);
            }
            
            // Process changes based on strategy
            for (const change of changes) {
                try {
                    const action = await this.decideSyncAction(change, strategy);
                    
                    switch (action) {
                        case 'download':
                            await this.downloadPage(change, localSpaceDir);
                            result.summary.downloaded++;
                            break;
                        case 'skip':
                            result.summary.skipped++;
                            break;
                        case 'cancel':
                            result.status = 'cancelled';
                            return result;
                    }
                } catch (error) {
                    this.outputChannel.appendLine(`[Space Sync] Error processing ${change.title}: ${error}`);
                    result.summary.errors++;
                }
            }
            
            const conflicts = changes.filter(c => c.status === 'conflict').length;
            result.summary.conflicts = conflicts;
            
            if (result.summary.errors > 0) {
                result.status = 'partial';
            }
            
            this.showSyncSummary(result);
            
        } catch (error: any) {
            this.outputChannel.appendLine(`[Space Sync] Sync failed: ${error.message}`);
            vscode.window.showErrorMessage(`Space sync failed: ${error.message}`);
            result.status = 'partial';
        }
        
        return result;
    }

    private async decideSyncAction(change: SpaceSyncChange, strategy: SyncStrategy): Promise<'download' | 'skip' | 'cancel'> {
        switch (strategy) {
            case SyncStrategy.REMOTE_WINS:
                return change.status === 'deleted' ? 'skip' : 'download';
                
            case SyncStrategy.LOCAL_WINS:
                return change.status === 'new' ? 'download' : 'skip';
                
            case SyncStrategy.BACKUP_AND_DOWNLOAD:
                return change.status === 'deleted' ? 'skip' : 'download';
                
            case SyncStrategy.ASK_USER:
                if (change.status === 'conflict') {
                    const choice = await vscode.window.showWarningMessage(
                        `Conflict detected for "${change.title}". Local file was modified after last sync.`,
                        { modal: true },
                        'Download (overwrites local)',
                        'Keep Local',
                        'Cancel Sync'
                    );
                    
                    switch (choice) {
                        case 'Download (overwrites local)': return 'download';
                        case 'Keep Local': return 'skip';
                        case 'Cancel Sync': return 'cancel';
                        default: return 'skip';
                    }
                } else {
                    return change.status === 'deleted' ? 'skip' : 'download';
                }
                
            default:
                return 'download';
        }
    }

    private async downloadPage(change: SpaceSyncChange, localSpaceDir: string): Promise<void> {
        const filePath = await this.client.downloadConfluencePage(
            change.pageId, 
            BodyFormat.STORAGE, 
            localSpaceDir
        );
        this.outputChannel.appendLine(`[Space Sync] Downloaded: ${change.title}`);
    }

    private async createBackup(localSpaceDir: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = join(localSpaceDir, '..', `backup_${timestamp}`);
        
        // Simple backup - copy all files
        mkdirSync(backupDir, { recursive: true });
        const files = this.getLocalConfluenceFiles(localSpaceDir);
        
        for (const file of files) {
            const fileName = basename(file);
            const backupFile = join(backupDir, fileName);
            const content = readFileSync(file, 'utf-8');
            writeFileSync(backupFile, content, 'utf-8');
        }
        
        return backupDir;
    }

    private getLocalConfluenceFiles(dir: string): string[] {
        if (!existsSync(dir)) {
            return [];
        }
        
        const files: string[] = [];
        const items = readdirSync(dir);
        
        for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);
            
            if (stat.isFile() && item.endsWith('.confluence')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    private sanitizeFileName(title: string): string {
        return title.replace(/[\\\\/:*?"<>|]/g, '_');
    }

    private showSyncSummary(result: SpaceSyncResult): void {
        const { summary } = result;
        const message = `Space sync ${result.status}: ${summary.downloaded} downloaded, ${summary.skipped} skipped, ${summary.conflicts} conflicts, ${summary.errors} errors`;
        
        if (result.status === 'completed' && summary.errors === 0) {
            vscode.window.showInformationMessage(message);
        } else {
            vscode.window.showWarningMessage(message);
        }
        
        this.outputChannel.appendLine(`[Space Sync] ${message}`);
    }
}
