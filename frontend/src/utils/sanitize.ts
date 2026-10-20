import DOMPurify from 'dompurify';

/**
 * Sanitizes untrusted or dynamic HTML strings before rendering.
 * Strips script tags, event handlers (onerror, onload, onclick), javascript: URIs,
 * and restricts tags/attributes to safe formatting elements.
 */
export function sanitizeHtml(dirty?: string | null): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'code', 'pre', 'sub', 'sup'
    ],
    ALLOWED_ATTR: ['style', 'class', 'dir'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'href', 'src']
  });
}