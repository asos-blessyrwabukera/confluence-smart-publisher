/**
 * Utility to generate YAML blocks for Markdown conversion
 */

/**
 * Generates a HTML comment block for ADF metadata and start marker
 * @param meta Object with metadata to serialize
 */
export function generateYamlBlock(meta: Record<string, unknown>): string {
  const lines = ['ADF-START'];
  for (const [key, value] of Object.entries(meta)) {
    lines.push(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
  }
  return ['<!--', ...lines, '-->'].join('\n');
} 