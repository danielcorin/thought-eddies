/**
 * Extracts a clean preview from MDX/Markdown content
 * @param body - The raw content body
 * @param maxLength - Maximum length of the preview (default: 300)
 * @returns A cleaned preview string
 */
export function getContentPreview(
  body: string,
  maxLength: number = 300
): string {
  if (!body) return '';

  // Remove frontmatter if present. Done first and anchored to the start of the
  // body so it can't swallow the text between two `---` entry separators.
  let content = body.replace(/^---\n[\s\S]*?\n---\n?/, '');

  // Remove all import statements (including multiline)
  content = content.replace(
    /^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm,
    ''
  );

  // Remove export statements
  content = content.replace(/^export\s+[\s\S]*?;\s*$/gm, '');

  // Unwrap components whose children are the entry's prose
  content = content.replace(/<\/?LinkedInPost\b[^>]*>/g, '');

  // Remove JSX/MDX components (both self-closing and with children)
  content = content.replace(/<[A-Z][^>]*\/>/g, ''); // Self-closing
  content = content.replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, ''); // With children

  // Remove HTML comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // Remove code blocks
  content = content.replace(/```[\s\S]*?```/g, '');
  content = content.replace(/`{3}[\s\S]*?`{3}/g, '[code block]');

  // Remove horizontal rules (logs separate entries with `---`)
  content = content.replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, '');

  // Remove MDX expressions
  content = content.replace(/\{[^}]*\}/g, '');

  // Clean up markdown formatting
  content = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // Remove bold/italic
    .replace(/^\s*[-*+>]\s+/gm, '') // Remove list markers and blockquotes
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();

  // Get first meaningful paragraph
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const firstParagraph = paragraphs[0] || '';

  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }

  // Truncate at word boundary
  const truncated = firstParagraph.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}
