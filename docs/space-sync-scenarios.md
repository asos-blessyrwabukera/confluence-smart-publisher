# Space Download and Sync Scenarios

This document explains what happens when you download a space again or want to sync changes between local and remote Confluence spaces.

## Scenario 1: Downloading the Same Space Again

### Current Behavior (Simple Download)

When you use **"Download Entire Space by ID"** on the same space multiple times:

```text
First Download:
📁 selected-folder/
└── 📁 space_PROJKEY/
    ├── 📄 Page 1.confluence
    ├── 📄 Page 2.confluence
    └── 📄 Page 3.confluence

Second Download (same space):
📁 selected-folder/
└── 📁 space_PROJKEY/    ← Same folder
    ├── 📄 Page 1.confluence  ← OVERWRITTEN
    ├── 📄 Page 2.confluence  ← OVERWRITTEN  
    ├── 📄 Page 3.confluence  ← OVERWRITTEN
    └── 📄 New Page.confluence ← NEW
```

**⚠️ WARNING**: 
- **All local changes are lost** - files are completely overwritten
- **No backup is created**
- **No conflict detection**
- New pages from Confluence are added
- Deleted pages remain locally (orphaned files)

### Recommended Approach: Use Space Sync Instead

For safer operations, use the **"Sync Space"** command which provides:
- Conflict detection
- Backup options
- User choice for each conflict
- Selective synchronization

## Scenario 2: Syncing Space Changes

The `SpaceSync` class provides sophisticated synchronization with multiple strategies:

### Sync Strategies Available

#### 1. **Interactive Sync** (`SyncStrategy.ASK_USER`)
- **Best for**: When you have local changes you want to preserve
- **Process**:
  1. Analyzes differences between local and remote
  2. Shows you each conflict
  3. Lets you choose: Keep Local, Use Remote, or View Diff
  4. Creates backup before any overwrites

```text
Conflict Detection:
📄 Page 1.confluence
   Local:  Modified 2 hours ago (v5)
   Remote: Modified 1 hour ago (v6)
   👤 Action: [Keep Local] [Use Remote] [View Diff]
```

#### 2. **Download Wins** (`SyncStrategy.DOWNLOAD_WINS`)
- **Best for**: When remote is authoritative
- **Process**:
  1. Downloads all remote changes
  2. Overwrites local files
  3. Creates backup in `backup_TIMESTAMP/` folder
  4. Local changes are preserved in backup only

#### 3. **Local Wins** (`SyncStrategy.LOCAL_WINS`)
- **Best for**: When you want to publish all local changes
- **Process**:
  1. Uploads all local changes to Confluence
  2. Remote changes are overwritten
  3. No backup needed (remote has version history)

#### 4. **Backup and Download** (`SyncStrategy.BACKUP_AND_DOWNLOAD`)
- **Best for**: Safe download with automatic backup
- **Process**:
  1. Creates complete backup of local space
  2. Downloads all remote content
  3. Backup location: `backup_YYYY-MM-DD_HH-MM-SS/`

## Change Detection Logic

The sync system detects changes by comparing:

### 1. **Version Numbers**
```typescript
// From CSP metadata in .confluence files
<csp:file_id>123456</csp:file_id>
// Compared with Confluence API version numbers
```

### 2. **File Modification Times**
- Local file system timestamps
- Confluence `lastModified` timestamps

### 3. **Content Hash** (Future Enhancement)
- MD5 hash of content for precise change detection

## Usage Examples

### Example 1: Safe Re-download with Backup

```text
1. Right-click on space_PROJKEY folder
2. Select "Confluence Smart Publisher > Sync Space"
3. Choose "Backup and Download"
4. Result:
   📁 selected-folder/
   ├── 📁 space_PROJKEY/          ← Updated content
   └── 📁 backup_2025-07-19_14-30/ ← Your old files
```

### Example 2: Interactive Conflict Resolution

```text
1. You modified: "Page 1.confluence" locally
2. Someone else modified it on Confluence
3. Sync detects conflict and shows options:
   
   ⚠️ CONFLICT DETECTED
   📄 Page 1.confluence
   
   Local Version:  Modified 2 hours ago
   Remote Version: Modified 1 hour ago
   
   Actions:
   [1] Keep Local Version
   [2] Use Remote Version  
   [3] View Differences
   [4] Skip This File
   
   Choose action (1-4): _
```

### Example 3: Bulk Upload Local Changes

```text
1. You've edited multiple pages locally
2. Want to publish all changes to Confluence
3. Use "Local Wins" strategy
4. All local files overwrite remote content
```

## Best Practices

### 🟢 DO:
- **Use Space Sync** instead of re-downloading for existing spaces
- **Choose "Interactive"** when you have local changes
- **Review conflicts** carefully before choosing action
- **Keep backups** when unsure
- **Commit changes to Git** before major sync operations

### 🔴 DON'T:
- **Re-download** over existing spaces with local changes
- **Use "Download Wins"** without backup if you have local changes
- **Ignore conflict warnings**
- **Delete backup folders** immediately after sync

## Technical Implementation

The space sync functionality is implemented in:
- `src/spaceSync.ts` - Core synchronization logic
- `src/commands.ts` - VS Code command integration
- `src/confluenceClient.ts` - API communication

### Key Methods:
- `analyzeSpaceChanges()` - Detects differences
- `syncSpace()` - Performs synchronization
- `createBackup()` - Creates safety backups
- `resolveConflict()` - Handles user choices

## Troubleshooting

### Issue: "No conflicts detected but files are different"
**Solution**: Check if CSP metadata is present in local files

### Issue: "Sync fails with permission errors"
**Solution**: Verify Confluence API credentials and page permissions

### Issue: "Backup folder is very large"
**Solution**: Clean up old backups periodically, configure backup retention

### Issue: "Some pages didn't sync"
**Solution**: Check output channel for detailed error messages

## Future Enhancements

1. **Smart Merge**: Automatic merging of non-conflicting changes
2. **Partial Sync**: Sync only specific pages or sections
3. **Scheduled Sync**: Automatic periodic synchronization
4. **Conflict Preview**: Side-by-side diff view before choosing action
5. **Sync History**: Track all sync operations with rollback capability
