# Download Entire Space by ID

This feature allows you to download all pages from a Confluence space using the space ID with support for both flat and hierarchical directory structures.

## How to Use

1. **Right-click on a folder** in VS Code Explorer where you want to save the space content
2. Select **Confluence Smart Publisher > Download Entire Space by ID**
3. Enter the **Space ID** when prompted (e.g., `12345678`)
4. **Choose download structure**:
   - **Hierarchical Structure (Recommended)**: Creates folders that mirror the Confluence page hierarchy
   - **Flat Structure**: Saves all pages in a single folder (legacy behavior)
5. The extension will:
   - Fetch all pages from the specified space
   - Create a folder named `space_<SPACE_KEY>` inside your selected directory
   - Download each page as a `.confluence` file
   - Organize files according to the chosen structure
   - Show progress and results

## Download Structures

### Hierarchical Structure (New)

Organizes pages in a directory tree that mirrors the Confluence page hierarchy:

```text
selected-folder/
└── space_SPACEKEY/
    ├── Root Page 1.confluence
    ├── Root Page 1/
    │   ├── Child Page A.confluence
    │   ├── Child Page A/
    │   │   └── Grandchild Page.confluence
    │   └── Child Page B.confluence
    ├── Root Page 2.confluence
    └── Root Page 2/
        └── Child Page C.confluence
```

**Benefits**:

- **Visual Hierarchy**: Easy navigation matching Confluence structure
- **Logical Organization**: Related pages grouped together
- **Better File Management**: Intuitive folder structure
- **Sync Compatible**: Works seamlessly with space sync functionality

### Flat Structure (Legacy)

Saves all pages in a single directory:

```text
selected-folder/
└── space_SPACEKEY/
    ├── Root Page 1.confluence
    ├── Child Page A.confluence
    ├── Grandchild Page.confluence
    ├── Child Page B.confluence
    ├── Root Page 2.confluence
    └── Child Page C.confluence
```

## Space ID vs Space Key

- **Space ID**: A numeric identifier (e.g., `12345678`)
- **Space Key**: A text identifier (e.g., `PROJ`, `DEV`, `DOCS`)

This feature uses the **Space ID**, not the Space Key.

## How to Find Space ID

You can find the Space ID in several ways:

1. **From Confluence URL**: When viewing a space, look at the URL parameters
2. **From API**: Use Confluence REST API to get space information
3. **From Browser Dev Tools**: Inspect network requests when browsing the space

## Features

- **Bulk Download**: Downloads all pages in a space at once
- **Structure Choice**: Select between hierarchical and flat organization
- **Progress Tracking**: Shows download progress with notifications
- **Error Handling**: Continues downloading even if some pages fail
- **Automatic Organization**: Creates organized folder structure
- **Complete Metadata**: Includes all page metadata (labels, properties, parent relationships)
- **Sync Compatible**: Both structures work with space synchronization

## Synchronization Support

The space sync functionality automatically detects whether you're using hierarchical or flat structure and works accordingly:

- **Hierarchical**: Maintains directory structure during sync
- **Flat**: Uses traditional flat file synchronization
- **Mixed**: Handles transitions between structures gracefully

## Error Handling

- If some pages fail to download, the process continues with others
- A summary shows successful vs failed downloads
- Check the output channel for detailed error information

## Notes

- Large spaces may take several minutes to download
- The space must be accessible with your configured credentials
- Downloaded files maintain the same format as individual page downloads
- Each page includes CSP metadata for publishing back to Confluence
