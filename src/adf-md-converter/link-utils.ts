/**
 * Async utility to resolve display text and YAML for a link node, including Confluence API title lookup.
 */
import { ConfluenceClient } from '../confluenceClient';

/**
 * Extracts a more readable title from URL when API lookup fails
 * @param url The URL to extract title from
 * @returns A readable title
 */
function extractReadableTitle(url: string): string {
  try {
    const decoded = decodeURIComponent(url);
    
    // Confluence page URLs - extract page title from URL structure
    if (/\/wiki\/spaces\//.test(decoded)) {
      // Try to extract title from URL patterns like:
      // /wiki/spaces/SPACE/pages/123456/Page+Title
      // /wiki/spaces/SPACE/pages/edit-v2/123456
      // /wiki/spaces/SPACE/pages/viewpage.action?pageId=123456
      const match = decoded.match(/\/pages\/(?:edit-v2\/|viewpage\.action\?pageId=)?(\d+)(?:\/([^?#]+))?/) ||
                    decoded.match(/pageId=(\d+)/) ||
                    decoded.match(/\/(\d+)(?:\/([^?#]+))?/);
      if (match) {
        const pageId = match[1];
        const titleFromUrl = match[2];
        
        if (titleFromUrl) {
          // Clean up URL-encoded title
          return titleFromUrl
            .replace(/\+/g, ' ')
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .split('/')
            .pop()
            ?.trim() || `Page ${pageId}`;
        }
        return `Page ${pageId}`;
      }
    }
    
    // Jira URLs - extract issue key
    if (/\/browse\/[A-Z]+-\d+/.test(decoded)) {
      const match = decoded.match(/\/browse\/([A-Z]+-\d+)/);
      return match ? match[1] : decoded;
    }
    
    // SharePoint URLs - extract file name
    if (decoded.includes('sharepoint.com')) {
      const match = decoded.match(/\/([^\/\?]+)\??/);
      if (match) {
        return decodeURIComponent(match[1])
          .replace(/\.[^.]+$/, '') // Remove extension
          .replace(/[-_]+/g, ' ')
          .trim();
      }
    }
    
    // Generic URL cleanup - extract meaningful part
    const parts = decoded.split('/').filter(Boolean);
    if (parts.length > 0) {
      let title = parts[parts.length - 1];
      
      // Remove query parameters and fragments
      title = title.split('?')[0].split('#')[0];
      
      // Clean up common URL patterns
      title = title
        .replace(/[-_]+/g, ' ')
        .replace(/\+/g, ' ')
        .replace(/\./g, ' ')
        .trim();
      
      // If title is still not readable (all numbers, too short), use domain
      if (/^\d+$/.test(title) || title.length < 3) {
        const urlObj = new URL(decoded);
        return urlObj.hostname.replace(/^www\./, '');
      }
      
      return title;
    }
    
    // Fallback to domain name
    const urlObj = new URL(decoded);
    return urlObj.hostname.replace(/^www\./, '');
    
  } catch {
    // If all else fails, return the original URL
    return url;
  }
}

export async function resolveLinkTextAndYaml({
  url,
  adfType,
  attrs,
  confluenceBaseUrl,
  originalType
}: {
  url: string;
  adfType: string;
  attrs: Record<string, unknown>;
  confluenceBaseUrl: string;
  originalType?: string;
}): Promise<{ text: string; url: string; yaml: Record<string, unknown> }> {
  const isJira = (u: string) => /\/browse\/[A-Z]+-\d+/.test(u);
  const isConfluence = (u: string) => /\/wiki\/spaces\//.test(u);
  const isSameConfluenceServer = (u: string, base: string) => {
    try {
      const urlObj = new URL(u);
      const baseObj = new URL(base);
      return urlObj.host === baseObj.host;
    } catch {
      return false;
    }
  };

  let text = '';
  
  // Try API lookup for same-server Confluence pages
  if (isConfluence(url) && confluenceBaseUrl && isSameConfluenceServer(url, confluenceBaseUrl)) {
    // Match various Confluence URL patterns to extract page ID
    const match = url.match(/\/pages\/(?:edit-v2\/|viewpage\.action\?pageId=)?(\d+)/) || 
                  url.match(/pageId=(\d+)/) ||
                  url.match(/\/(\d+)(?:\/|$)/);
    if (match) {
      const pageId = match[1];
      try {
        // Check if Confluence configuration is available before attempting API call
        const { workspace } = await import('vscode');
        const config = workspace.getConfiguration('confluenceSmartPublisher');
        const baseUrl = config.get('baseUrl') as string;
        const username = config.get('username') as string;
        const apiToken = config.get('apiToken') as string;
        
        if (baseUrl && username && apiToken) {
          const client = new ConfluenceClient();
          const page = await client.getPageById(pageId);
          if (page && page.title) {
            text = page.title;
          }
        } else {
          console.log(`Confluence configuration not complete, skipping API lookup for page ${pageId}`);
        }
      } catch (error) {
        console.log(`Failed to fetch page title for ${pageId}:`, error);
        // API failed, fall through to manual extraction
      }
    }
  }
  
  // If API lookup failed or not applicable, extract readable title
  if (!text) {
    text = extractReadableTitle(url);
  }

  const yaml: Record<string, unknown> = {
    adfType,
    ...attrs,
  };
  if (originalType) {
    yaml.originalType = originalType;
  }
  return { text, url, yaml };
} 