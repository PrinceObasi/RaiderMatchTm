import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'ul', 'li', 'p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}

export function renderSafeHTML(content: string) {
  try {
    const sanitized = sanitizeHTML(content);
    // Only use dangerouslySetInnerHTML if content actually has HTML tags
    if (sanitized !== content || /<[^>]*>/g.test(sanitized)) {
      return { __html: sanitized };
    }
    return null;
  } catch {
    return null;
  }
}