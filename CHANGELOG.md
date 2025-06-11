# Change Log

All notable changes to the "confluence-smart-publisher" extension will be documented in this file.

## [0.1.3] - 2025-06-07
- Removed required attributes for 'ri:space' tag in Confluence schema
- Removed required attribute 'ri:space-key' for 'ri:page' tag in Confluence schema


## [0.1.2] - 205-06-06
- Fixed LI tag formatting and corrected the required attribute for `<ri:user>` tag

## [0.1.1] - 2025-06-05
- Added new command to convert Markdown files to Confluence Storage Format
- Added support for common Markdown syntax including headers, lists, code blocks, and tables

## [0.0.8] - 2025-06-05
- Resolved broken image links in README documentation
- Optimized extension package size by removing unnecessary image assets

## [0.0.7] - 2025-06-04
- Removed the "Compare Local Document with Published" command (diffWithPublished) to simplify the interface
- Kept only the "Sync with Published on Confluence" command which already includes the comparison functionality
- Bugfix in the page title emoji definition command
- Bugfix on Confluence Diagnostics

## [0.0.6] - 2025-06-04
- Some minor bug fixes
- Fixed chapter numbering
- Changed the numbering format

**Before**:

> 1\. Title <br>
> 1\.1\. Subtitle <br>
> 1\.1\.1\. Sub-subtitle <br>

**After**:
> 1\. Title <br>
> 1\.1\. Subtitle <br>
> 1\.1\.1\. Sub-subtitle <br>

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