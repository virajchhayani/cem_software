import * as sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML input to prevent XSS attacks
 * @param html HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtmlInput(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Sanitize text input (remove HTML tags)
 * @param text Text string to sanitize
 * @returns Sanitized text string
 */
export function sanitizeTextInput(text: string): string {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text: string) => text,
  });
}

/**
 * Sanitize input based on type
 * @param input Input string
 * @param type Type of input (html, text, url)
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, type: 'html' | 'text' | 'url' = 'text'): string {
  switch (type) {
    case 'html':
      return sanitizeHtmlInput(input);
    case 'text':
      return sanitizeTextInput(input);
    case 'url':
      return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
        allowedSchemes: ['http', 'https'],
      });
    default:
      return sanitizeTextInput(input);
  }
}
