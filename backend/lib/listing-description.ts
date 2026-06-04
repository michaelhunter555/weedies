import {
  APP_DESCRIPTION_MAX_STORED_CHARS,
  APP_DESCRIPTION_MAX_WORDS,
  APP_DESCRIPTION_MIN_PLAIN_TEXT,
  htmlPlainTextLength,
  htmlPlainTextWordCount,
  isValidAppDescriptionHtml,
  sanitizeHtml,
} from "./sanitize-html";

export {
  APP_DESCRIPTION_MAX_STORED_CHARS,
  APP_DESCRIPTION_MAX_WORDS,
  APP_DESCRIPTION_MIN_PLAIN_TEXT,
  htmlPlainTextLength,
  htmlPlainTextWordCount,
  isValidAppDescriptionHtml,
  sanitizeHtml,
};

export function prepareAppDescriptionForWrite(
  raw: unknown,
  options?: { minPlainText?: number },
): { ok: true; value: string } | { ok: false; message: string } {
  const min = options?.minPlainText ?? 0;
  const value = sanitizeHtml(String(raw ?? ""));

  if (value.length > APP_DESCRIPTION_MAX_STORED_CHARS) {
    return {
      ok: false,
      message: "Description is too long. Please shorten formatting or text.",
    };
  }

  const words = htmlPlainTextWordCount(value);
  if (words > APP_DESCRIPTION_MAX_WORDS) {
    return {
      ok: false,
      message: `Description is too long (max ${APP_DESCRIPTION_MAX_WORDS} words, currently ${words}).`,
    };
  }

  if (min > 0 && htmlPlainTextLength(value) < min) {
    return {
      ok: false,
      message: `Description must be at least ${min} characters of text (excluding formatting).`,
    };
  }

  return { ok: true, value };
}

/** Sanitize `appDescription` on listing write payloads. */
export function applySanitizedListingFields(
  payload: Record<string, unknown>,
  options?: { minPlainText?: number },
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!("appDescription" in payload)) {
    return { ok: true, data: payload };
  }

  const prepared = prepareAppDescriptionForWrite(
    payload.appDescription,
    options,
  );
  if (!prepared.ok) return prepared;

  return {
    ok: true,
    data: { ...payload, appDescription: prepared.value },
  };
}

/** Sanitize description HTML on API responses (defense in depth). */
export function sanitizeListingDescriptionFields<
  T extends Record<string, unknown>,
>(record: T): T {
  if (typeof record.appDescription !== "string") return record;
  return {
    ...record,
    appDescription: sanitizeHtml(record.appDescription),
  };
}
