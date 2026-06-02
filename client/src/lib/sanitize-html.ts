import DOMPurify from "dompurify";

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

/** Browser-only sanitize (display/editor). Writes are sanitized on the API. */
export function sanitizeAppDescriptionHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";
  if (typeof window === "undefined") {
    return dirty.trim();
  }
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG).trim();
}

export function descriptionPlainTextLength(html: string): number {
  const clean = sanitizeAppDescriptionHtml(html);
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

export function isAppDescriptionValid(
  html: string,
  minPlainText = APP_DESCRIPTION_MIN_PLAIN_TEXT,
): boolean {
  return descriptionPlainTextLength(html) >= minPlainText;
}

const HTML_TAG_START = /<\/?[a-z][^>]*>/i;

function looksLikeHtml(value: string): boolean {
  return HTML_TAG_START.test(value);
}

/**
 * Legacy listings sometimes store a plain-text prefix before HTML markup
 * (e.g. "About\\n\\n<p>…</p>"). TipTap shows the tags as literal text unless
 * the prefix is wrapped in block elements first.
 */
export function wrapLeadingPlainTextBeforeHtml(html: string): string {
  const match = html.match(HTML_TAG_START);
  if (!match || match.index == null || match.index === 0) return html;

  const leading = html.slice(0, match.index).trim();
  if (!leading || leading.includes("<")) return html;

  const escaped = leading
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const prefix = escaped
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

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
