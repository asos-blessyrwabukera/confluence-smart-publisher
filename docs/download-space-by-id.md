# Download Entire Space by ID

This feature allows you to download all pages from a Confluence space using the space ID.

## How to Use

1. **Right-click on a folder** in VS Code Explorer where you want to save the space content
2. Select **Confluence Smart Publisher > Download Entire Space by ID**
3. Enter the **Space ID** when prompted (e.g., `12345678`)
4. The extension will:
   - Fetch all pages from the specified space
   - Create a folder named `space_<SPACE_KEY>` inside your selected directory
   - Download each page as a `.confluence` file
   - Show progress and results

## Space ID vs Space Key

- **Space ID**: A numeric identifier (e.g., `12345678`)
- **Space Key**: A text identifier (e.g., `PROJ`, `DEV`, `DOCS`)

This feature uses the **Space ID**, not the Space Key.

## How to Find Space ID

You can find the Space ID in several ways:

1. **From Confluence URL**: When viewing a space, look at the URL parameters
2. **From API**: Use Confluence REST API to get space information
3. **From Browser Dev Tools**: Inspect network requests when browsing the space

## Output Structure

```text
selected-folder/
└── space_SPACEKEY/
    ├── Page Title 1.confluence
    ├── Page Title 2.confluence
    ├── Subfolder Page.confluence
    └── ...
```

## Features

- **Bulk Download**: Downloads all pages in a space at once
- **Progress Tracking**: Shows download progress with notifications
- **Error Handling**: Continues downloading even if some pages fail
- **Automatic Organization**: Creates organized folder structure
- **Complete Metadata**: Includes all page metadata (labels, properties, etc.)

## Error Handling

- If some pages fail to download, the process continues with others
- A summary shows successful vs failed downloads
- Check the output channel for detailed error information

## Notes

- Large spaces may take several minutes to download
- The space must be accessible with your configured credentials
- Downloaded files maintain the same format as individual page downloads
- Each page includes CSP metadata for publishing back to Confluence
