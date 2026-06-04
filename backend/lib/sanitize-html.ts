import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
  "code",
  "pre",
];

const ALLOWED_ATTR: string[] = [];

/** Strip scripts, event handlers, and unsafe markup from rich-text HTML. */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  }).trim();
}

/** Plain text extracted from description HTML (ignores tags). */
export function htmlPlainText(html: string): string {
  const clean = sanitizeHtml(html);
  if (!clean) return "";
  return clean
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain-text length for validation (ignores HTML tags). */
export function htmlPlainTextLength(html: string): number {
  return htmlPlainText(html).length;
}

/** Word count from plain text (whitespace-separated tokens). */
export function htmlPlainTextWordCount(html: string): number {
  const text = htmlPlainText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export const APP_DESCRIPTION_MIN_PLAIN_TEXT = 40;
export const APP_DESCRIPTION_MAX_WORDS = 600;
/** MongoDB hard cap; well above 600 words of formatted HTML. */
export const APP_DESCRIPTION_MAX_STORED_CHARS = 16_000;

export function isValidAppDescriptionHtml(
  html: string,
  minPlainText = APP_DESCRIPTION_MIN_PLAIN_TEXT,
  maxWords = APP_DESCRIPTION_MAX_WORDS,
): boolean {
  const sanitized = sanitizeHtml(html);
  if (sanitized.length > APP_DESCRIPTION_MAX_STORED_CHARS) return false;
  const words = htmlPlainTextWordCount(sanitized);
  if (words > maxWords) return false;
  return htmlPlainTextLength(sanitized) >= minPlainText;
}
