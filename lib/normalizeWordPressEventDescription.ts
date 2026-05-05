/**
 * Prepares raw WordPress ride event description text for ReactMarkdown.
 * Normalizes newlines, list markers (common WP quirks), and invisible characters.
 */
export function normalizeWordPressEventDescription(description: string): string {
  return (
    description
      // Convert common WP HTML paragraph/line-break tags into markdown-friendly newlines
      .replace(/<br\s*\/?>(\n)?/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<\/?p>/gi, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // normalize common non-breaking/zero-width spaces
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B\uFEFF\u2060]/g, '')
      // Convert en-dash / em-dash list markers at line-start to hyphen
      .replace(/^\s*[–—]\s+/gm, '- ')
      // Convert common bullet characters to hyphen
      .replace(/^\s*[•·]\s+/gm, '- ')
      // Convert lines starting with various bullet-like markers (including tabs/spaces) to hyphen
      .replace(/^[\s\u00A0\u200B\uFEFF\u2060]*[*+\u2022\u00B7\u2023-]\s+/gm, '- ')
      // Convert numbered lists using ')' or '.' to canonical numbered form (e.g., '1.' stays '1.')
      .replace(/^[\s\u00A0\u200B\uFEFF\u2060]*(\d+)[).]+\s*/gm, (_m, n) => `${n}. `)
      // Ensure a blank line before the first list line after non-list text (not between list items).
      .replace(/\n(?=\s*(?:[-*+]|\d+[.)])\s)/g, (match, offset, full) => {
        const prevLineStart = full.lastIndexOf('\n', offset - 1) + 1;
        const prevLine = full.slice(prevLineStart, offset);
        if (/^\s*(?:[-*+]|\d+\.)\s/.test(prevLine)) return '\n';
        return '\n\n';
      })
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
  );
}
