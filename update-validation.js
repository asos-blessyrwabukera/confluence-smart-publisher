const MarkdownIt = require('markdown-it');
const markdownItAdmonition = require('markdown-it-admonition');
const fs = require('fs');
const path = require('path');

// Configure markdown-it with admonitions
const md = new MarkdownIt({
    html: true,
    xhtmlOut: false,
    breaks: false,
    linkify: true,
    typographer: true,
    quotes: '""\'\'',
    highlight: function(str, lang) {
        if (lang && lang.trim()) {
            const languageClass = `language-${lang.trim()}`;
            const escaped = str.replace(/[&<>"']/g, (m) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[m]);
            return `<pre class="highlight"><code class="${languageClass}">${escaped}</code></pre>`;
        }
        const escaped = str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[m]);
        return `<pre class="highlight"><code>${escaped}</code></pre>`;
    }
});

// Configure admonitions plugin
md.use(markdownItAdmonition);

/**
 * Process SCSS variables to CSS
 */
function processSCSSVariables(scss) {
    // Basic color variables from Material Design
    const colorMap = {
        '$clr-blue-a200': '#448aff',
        '$clr-light-blue-a400': '#00bcd4',
        '$clr-cyan-a700': '#00b8d4',
        '$clr-teal-a700': '#00bfa5',
        '$clr-green-a700': '#00c853',
        '$clr-light-green-a700': '#64dd17',
        '$clr-orange-a400': '#ff9100',
        '$clr-red-a200': '#ff5252',
        '$clr-red-a400': '#ff1744',
        '$clr-pink-a400': '#f50057',
        '$clr-deep-purple-a200': '#7c4dff',
        '$clr-grey': '#9e9e9e'
    };

    // Remove SCSS comments and imports
    let css = scss
        .replace(/\/\/\/.*$/gm, '') // Remove triple slash comments
        .replace(/\/\/.*$/gm, '')   // Remove double slash comments
        .replace(/@import.*?;/g, '') // Remove imports
        .replace(/@use.*?;/g, '')    // Remove use statements
        .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

    // Replace color variables
    for (const [variable, color] of Object.entries(colorMap)) {
        css = css.replace(new RegExp('\\' + variable.replace('$', '\\$'), 'g'), color);
    }

    // Remove SCSS specific syntax
    css = css
        .replace(/\$[a-zA-Z0-9-_]+:/g, '--') // Convert SCSS variables to CSS custom properties
        .replace(/!default/g, '') // Remove !default
        .replace(/@use\s+["'][^"']+["']/g, '') // Remove @use statements
        .replace(/\$admonitions:\s*\([^)]+\)\s*!default;/s, ''); // Remove admonition map

    return css;
}

/**
 * Load CSS files from assets/css directory
 */
function loadMaterialCss() {
    const cssFiles = [
        'material.css',
        'palette.scss',
        'admonitions.scss'
    ];
    
    let combinedCss = '';
    
    for (const file of cssFiles) {
        try {
            const cssPath = path.join('assets', 'css', file);
            if (fs.existsSync(cssPath)) {
                let content = fs.readFileSync(cssPath, 'utf-8');
                
                // Basic SCSS variable processing for colors
                if (file.endsWith('.scss')) {
                    content = processSCSSVariables(content);
                }
                
                combinedCss += content + '\n';
                console.log(`✅ Loaded CSS file: ${file}`);
            } else {
                console.warn(`⚠️  CSS file not found: ${file}`);
            }
        } catch (error) {
            console.warn(`❌ Could not load CSS file: ${file}`, error.message);
        }
    }
    
    // Add fallback styles for better preview
    const fallbackCss = `
/* Material for MkDocs Enhanced Styles */
:root {
    --md-primary-fg-color: #1976d2;
    --md-primary-fg-color--light: #64b5f6;
    --md-primary-fg-color--dark: #0d47a1;
    --md-accent-fg-color: #ff5722;
    --md-default-bg-color: #ffffff;
    --md-default-fg-color: #000000;
    --md-default-fg-color--light: #8a8a8a;
    --md-default-fg-color--lighter: #b3b3b3;
    --md-default-fg-color--lightest: #cccccc;
    --md-code-bg-color: #f5f5f5;
    --md-code-fg-color: #37474f;
    --md-admonition-note-color: #448aff;
    --md-admonition-tip-color: #00c853;
    --md-admonition-warning-color: #ff9100;
    --md-admonition-danger-color: #ff5252;
    --md-admonition-success-color: #00e676;
    --md-admonition-info-color: #00b8d4;
    --md-admonition-question-color: #9c27b0;
    --md-admonition-quote-color: #9e9e9e;
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: var(--md-default-fg-color);
    background-color: var(--md-default-bg-color);
    margin: 0;
    padding: 20px;
}

.md-content {
    max-width: 1200px;
    margin: 0 auto;
}

.md-content__inner {
    padding: 0 16px;
}

.md-typeset {
    font-size: 16px;
    line-height: 1.6;
    color: var(--md-default-fg-color);
}

/* Headings */
.md-typeset h1,
.md-typeset h2,
.md-typeset h3,
.md-typeset h4,
.md-typeset h5,
.md-typeset h6 {
    margin: 1.25em 0 0.5em;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: var(--md-default-fg-color);
}

.md-typeset h1 {
    font-size: 2.5em;
    font-weight: 300;
    letter-spacing: -0.02em;
}

.md-typeset h2 {
    font-size: 2em;
    font-weight: 300;
    letter-spacing: -0.01em;
}

.md-typeset h3 {
    font-size: 1.5em;
    font-weight: 400;
}

.md-typeset h4 {
    font-size: 1.25em;
    font-weight: 500;
}

.md-typeset h5 {
    font-size: 1.125em;
    font-weight: 500;
}

.md-typeset h6 {
    font-size: 1em;
    font-weight: 500;
}

/* Paragraphs */
.md-typeset p {
    margin: 0 0 1em;
}

/* Lists */
.md-typeset ul,
.md-typeset ol {
    margin: 0 0 1em;
    padding-left: 1.5em;
}

.md-typeset li {
    margin: 0.25em 0;
}

/* Code */
.md-typeset code {
    background-color: var(--md-code-bg-color);
    color: var(--md-code-fg-color);
    padding: 0.125em 0.25em;
    border-radius: 0.125em;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.85em;
}

.md-typeset pre {
    background-color: var(--md-code-bg-color);
    color: var(--md-code-fg-color);
    border-radius: 0.25em;
    padding: 1em;
    margin: 1em 0;
    overflow-x: auto;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.85em;
    line-height: 1.4;
}

.md-typeset pre code {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
}

/* Tables */
.md-typeset table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
    margin: 1em 0;
    border: 1px solid var(--md-default-fg-color--lightest);
}

.md-typeset th,
.md-typeset td {
    padding: 0.5em 1em;
    border-bottom: 1px solid var(--md-default-fg-color--lightest);
    text-align: left;
}

.md-typeset th {
    background-color: var(--md-code-bg-color);
    font-weight: 500;
}

/* Links */
.md-typeset a {
    color: var(--md-primary-fg-color);
    text-decoration: none;
}

.md-typeset a:hover {
    text-decoration: underline;
}

/* Blockquotes */
.md-typeset blockquote {
    border-left: 4px solid var(--md-default-fg-color--lightest);
    padding-left: 1em;
    margin: 1em 0;
    color: var(--md-default-fg-color--light);
}

/* Admonitions */
.admonition {
    margin: 1.5625em 0;
    padding: 0 0.75em;
    overflow: hidden;
    page-break-inside: avoid;
    border-left: 0.25em solid;
    border-radius: 0.125em;
    box-shadow: 0 0.25em 0.5em rgba(0, 0, 0, 0.05);
}

.admonition > :last-child {
    margin-bottom: 0.75em;
}

.admonition-title {
    position: relative;
    margin: 0 -0.75em 0.75em;
    padding: 0.5em 0.75em 0.5em 2.5em;
    font-weight: 700;
    background-color: rgba(68, 138, 255, 0.1);
}

.admonition-title::before {
    position: absolute;
    top: 0.5em;
    left: 0.75em;
    width: 1.25em;
    height: 1.25em;
    content: attr(data-icon);
}

/* Note admonition */
.admonition.note {
    border-color: var(--md-admonition-note-color);
}

.admonition.note > .admonition-title {
    background-color: rgba(68, 138, 255, 0.1);
}

/* Tip admonition */
.admonition.tip {
    border-color: var(--md-admonition-tip-color);
}

.admonition.tip > .admonition-title {
    background-color: rgba(0, 200, 83, 0.1);
}

/* Warning admonition */
.admonition.warning {
    border-color: var(--md-admonition-warning-color);
}

.admonition.warning > .admonition-title {
    background-color: rgba(255, 145, 0, 0.1);
}

/* Danger admonition */
.admonition.danger {
    border-color: var(--md-admonition-danger-color);
}

.admonition.danger > .admonition-title {
    background-color: rgba(255, 82, 82, 0.1);
}

/* Success admonition */
.admonition.success {
    border-color: var(--md-admonition-success-color);
}

.admonition.success > .admonition-title {
    background-color: rgba(0, 230, 118, 0.1);
}

/* Info admonition */
.admonition.info {
    border-color: var(--md-admonition-info-color);
}

.admonition.info > .admonition-title {
    background-color: rgba(0, 184, 212, 0.1);
}

/* Question admonition */
.admonition.question {
    border-color: var(--md-admonition-question-color);
}

.admonition.question > .admonition-title {
    background-color: rgba(156, 39, 176, 0.1);
}

/* Quote admonition */
.admonition.quote {
    border-color: var(--md-admonition-quote-color);
}

.admonition.quote > .admonition-title {
    background-color: rgba(158, 158, 158, 0.1);
}

/* Responsive design */
@media (max-width: 768px) {
    .md-content__inner {
        padding: 0 8px;
    }
    
    .md-typeset {
        font-size: 14px;
    }
    
    .md-typeset h1 {
        font-size: 2em;
    }
    
    .md-typeset h2 {
        font-size: 1.75em;
    }
}
    `;
    
    return combinedCss + fallbackCss;
}

try {
    console.log('🚀 Generating updated validation HTML with Material for MkDocs CSS...');
    
    // Load Material CSS
    const cssContent = loadMaterialCss();
    
    // Read the test case file
    if (!fs.existsSync('test-case.md')) {
        throw new Error('test-case.md file not found!');
    }
    
    const testContent = fs.readFileSync('test-case.md', 'utf-8');
    console.log('📖 Loaded test content from test-case.md');
    
    // Render markdown to HTML
    const htmlContent = md.render(testContent);
    console.log('🔧 Markdown rendered to HTML');
    
    // Create complete HTML document
    const completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Preview Validation - Material for MkDocs (Updated)</title>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <div class="md-content">
        <article class="md-content__inner md-typeset">
            <div style="background: #e3f2fd; padding: 1rem; border-radius: 0.25rem; margin-bottom: 2rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">🎯 Validation Page - Updated with Material for MkDocs CSS</h4>
                <p style="margin: 0; font-size: 0.9rem; color: #666;">
                    This page demonstrates the Markdown rendering with extracted CSS from mkdocs-material repository.
                    Compare with the expected Material for MkDocs styling.
                </p>
            </div>
            ${htmlContent}
        </article>
    </div>
</body>
</html>`;

    // Write the validation HTML file
    fs.writeFileSync('validation-updated.html', completeHtml, 'utf-8');
    
    console.log('✅ Updated validation HTML file generated successfully: validation-updated.html');
    console.log('📄 Open this file in your browser to validate the updated rendering.');
    console.log('🔍 Compare with the original validation.html to see the differences.');
    
} catch (error) {
    console.error('❌ Error generating updated validation HTML:', error.message);
    process.exit(1);
}