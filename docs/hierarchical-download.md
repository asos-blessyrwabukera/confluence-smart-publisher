# Hierarchical Space Download

The Confluence Smart Publisher extension now supports downloading Confluence spaces with hierarchical directory structure that mirrors the page relationships in Confluence.

## Overview

When you download a space using the hierarchical option, the extension:

1. **Analyzes Page Relationships**: Examines parent-child relationships between pages
2. **Builds Directory Tree**: Creates a folder structure that matches the Confluence hierarchy
3. **Downloads Strategically**: Places each page in the appropriate directory based on its position in the hierarchy
4. **Handles Edge Cases**: Manages orphaned pages and missing parent relationships gracefully

## How It Works

### Page Hierarchy Detection

The extension uses the `parentId` field from each page to build a complete hierarchy tree:

```typescript
// Example page relationships
Root Page (parentId: null)
├── Child Page A (parentId: Root Page ID)
│   └── Grandchild Page (parentId: Child Page A ID)
└── Child Page B (parentId: Root Page ID)
```

### Directory Structure Creation

This hierarchy translates to the following directory structure:

```text
My Confluence Space/
├── Root_Page.confluence
├── Root_Page/
│   ├── Child_Page_A.confluence
│   ├── Child_Page_A/
│   │   └── Grandchild_Page.confluence
│   └── Child_Page_B.confluence
```

The root folder is named after the space name (e.g., "My Confluence Space") instead of using the space ID format, making it easier to identify and organize multiple spaces.

## Algorithm Details

### Phase 1: Relationship Mapping
1. Fetch all pages from the space
2. Create a map of page ID to page object
3. Build parent-child relationship map
4. Identify root pages (no parent)

### Phase 2: Hierarchy Building
1. Start with root pages
2. For each page, create a directory named after the page title
3. Recursively process child pages in subdirectories
4. Handle file name sanitization for file system compatibility

### Phase 3: Download Execution
1. Download each page to its determined directory
2. Create folder structures as needed
3. Handle errors gracefully (continue with other pages)
4. Report progress and results

## Edge Case Handling

### Orphaned Pages
Pages with `parentId` values that don't exist in the space are placed in the root directory:

```text
My Confluence Space/
├── Valid_Root_Page.confluence
├── Valid_Root_Page/
│   └── Valid_Child.confluence
└── Orphaned_Page.confluence  ← Parent doesn't exist
```

### Circular References
While Confluence typically prevents circular references, the algorithm handles them by:
- Detecting circular dependencies during tree building
- Breaking circles by treating subsequent occurrences as orphaned pages
- Logging warnings for manual review

### File Name Conflicts
When multiple pages have the same title, the algorithm:
- Sanitizes special characters for file system compatibility
- Uses page ID as a suffix for disambiguation if needed
- Ensures no file overwrites occur

## Sync Compatibility

The hierarchical structure is fully compatible with the space sync feature:

### Detection
The sync process automatically detects hierarchical vs flat structure by:
1. Scanning for subdirectories containing `.confluence` files
2. Adapting sync behavior accordingly

### Synchronization
- **New Pages**: Downloaded to appropriate hierarchical location
- **Updated Pages**: Updated in their current location
- **Deleted Pages**: Removed from their hierarchical location
- **Moved Pages**: Handled by updating location based on new parent relationship

## Performance Considerations

### Memory Usage
- Builds complete hierarchy in memory before downloading
- Efficient for spaces with thousands of pages
- Memory usage scales linearly with page count

### Network Efficiency
- Single API call to fetch all pages
- Concurrent downloads where possible
- Graceful degradation on network errors

### File System Efficiency
- Creates directories only as needed
- Atomic file operations to prevent corruption
- Handles long path names appropriately

## Migration from Flat Structure

Existing flat structure spaces can be migrated to hierarchical:

1. **Download New Hierarchy**: Use hierarchical download to a new location
2. **Compare Content**: Use VS Code's diff features to compare files
3. **Manual Review**: Review any structural changes
4. **Replace Old Structure**: Replace flat structure with hierarchical

## Best Practices

### When to Use Hierarchical
- **Large Spaces**: Better organization for spaces with many pages
- **Complex Structure**: Spaces with deep page hierarchies
- **Team Collaboration**: Easier navigation for team members
- **Long-term Maintenance**: Better for ongoing content management

### When to Use Flat
- **Simple Spaces**: Spaces with few pages or flat structure
- **Legacy Compatibility**: Maintaining compatibility with existing workflows
- **Automation Scripts**: Scripts that expect flat file structure

## Troubleshooting

### Common Issues

#### Permission Errors
```
Error: EACCES: permission denied, mkdir 'C:\path\to\space'
```
**Solution**: Ensure write permissions to target directory

#### Long Path Names
```
Error: ENAMETOOLONG: name too long
```
**Solution**: Choose shorter base directory path or use shorter page titles

#### Missing Parent Pages
```
Warning: Page "Child Page" has parent ID 12345 which was not found
```
**Solution**: Manual review required - parent may be in different space or deleted

### Debugging

Enable debug logging by checking the Output Channel:
1. Open VS Code Output panel
2. Select "Confluence Smart Publisher" from dropdown
3. Review detailed operation logs

## API Reference

### New Methods

#### `downloadSpacePagesHierarchical()`
```typescript
async downloadSpacePagesHierarchical(
    spaceId: string, 
    outputDir: string = 'Downloaded', 
    bodyFormat: BodyFormat = BodyFormat.ATLAS_DOC_FORMAT
): Promise<string[]>
```

Downloads space pages with hierarchical directory structure.

**Parameters:**
- `spaceId`: Confluence space ID
- `outputDir`: Target directory for downloads
- `bodyFormat`: Content format for downloads

**Returns:** Array of downloaded file paths

### Enhanced Methods

#### `getLocalConfluenceFiles()` (SpaceSync)
Now recursively scans subdirectories for hierarchical structure support.

#### `downloadPage()` (SpaceSync)
Automatically detects and maintains hierarchical structure during sync operations.

## Configuration

Currently no additional configuration is required. The feature uses existing extension settings:

- `confluenceSmartPublisher.baseUrl`
- `confluenceSmartPublisher.username`
- `confluenceSmartPublisher.apiToken`

Future versions may add hierarchical-specific configuration options.
