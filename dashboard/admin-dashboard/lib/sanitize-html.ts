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

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: [] as string[],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeAppDescriptionHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG).trim();
}

function descriptionPlainText(html: string): string {
  const clean = sanitizeAppDescriptionHtml(html);
  if (!clean) return "";
  return clean
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function descriptionPlainTextLength(html: string): number {
  return descriptionPlainText(html).length;
}

export function descriptionPlainTextWordCount(html: string): number {
  const text = descriptionPlainText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export const APP_DESCRIPTION_MIN_PLAIN_TEXT = 40;
export const APP_DESCRIPTION_MAX_WORDS = 600;

export function isAppDescriptionValid(
  html: string,
  minPlainText = APP_DESCRIPTION_MIN_PLAIN_TEXT,
  maxWords = APP_DESCRIPTION_MAX_WORDS,
): boolean {
  const words = descriptionPlainTextWordCount(html);
  if (words > maxWords) return false;
  return descriptionPlainTextLength(html) >= minPlainText;
}

const HTML_TAG_START = /<\/?[a-z][^>]*>/i;

function looksLikeHtml(value: string): boolean {
  return HTML_TAG_START.test(value);
}

function wrapLeadingPlainTextBeforeHtml(html: string): string {
  const match = html.match(HTML_TAG_START);
  if (!match || match.index == null || match.index === 0) return html;

  const leading = html.slice(0, match.index).trim();
  if (!leading || leading.includes("<")) return html;

  const escaped = leading
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const prefix = `<p>${escaped.replace(/\n/g, "<br>")}</p>`;

  return prefix + html.slice(match.index);
}

/** Load legacy plain-text descriptions into TipTap as HTML. */
export function toEditorHtml(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (looksLikeHtml(t)) {
    return sanitizeAppDescriptionHtml(wrapLeadingPlainTextBeforeHtml(t));
  }
  const escaped = t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n\n+/).filter(Boolean);
  if (paragraphs.length === 0) return "";
  return paragraphs
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
