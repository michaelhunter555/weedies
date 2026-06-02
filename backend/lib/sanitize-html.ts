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

/** Plain-text length for validation (ignores HTML tags). */
export function htmlPlainTextLength(html: string): number {
  const clean = sanitizeHtml(html);
  if (!clean) return 0;
  const text = clean
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length;
}

export const APP_DESCRIPTION_MIN_PLAIN_TEXT = 40;
export const APP_DESCRIPTION_MAX_HTML = 32_000;

export function isValidAppDescriptionHtml(
  html: string,
  minPlainText = APP_DESCRIPTION_MIN_PLAIN_TEXT,
): boolean {
  const sanitized = sanitizeHtml(html);
  if (sanitized.length > APP_DESCRIPTION_MAX_HTML) return false;
  return htmlPlainTextLength(sanitized) >= minPlainText;
}
