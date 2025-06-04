# Change Log

All notable changes to the "confluence-smart-publisher" extension will be documented in this file.

## [0.0.7] - 2025-06-05
- Removed the "Compare Local Document with Published" command (diffWithPublished) to simplify the interface
- Kept only the "Sync with Published on Confluence" command which already includes the comparison functionality
- Bugfix in the page title emoji definition command

## [0.0.6] - 2025-06-04
- Some minor bug fixes
- Fixed chapter numbering
- Changed the numbering format

**Before**:

> 1 Title
> 1.1 Subtitle
> 1.1.1 Sub-subtitle

**After**:
> 1. Title
> 1.1. Subtitle
> 1.1.1. Sub-subtitle

## [0.0.5] - 2025-06-02
- Readme translated to English
- All user communications translated to English

## [0.0.4] - 2025-05-30
- Code formatting refactoring to make it simpler, more efficient, and better organized

## [0.0.3] - 2025-05-29
- Added "Decode HTML entities" command to the extension manifest and context menu for .confluence files
- Removed "Encode HTML entities" option when publishing, as it's not necessary and causes conflicts with Confluence

## [0.0.2] - 2025-05-28
- New smart snippets for custom Confluence tags
- HtmlEntities mode support: automatic conversion of special characters to HTML entities when publishing or downloading pages

## [0.0.1] - 2025-05-27
- First version: publishing, downloading, formatting, diff and synchronization of Confluence pages