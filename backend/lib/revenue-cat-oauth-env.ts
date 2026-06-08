const LOG_PREFIX = "[revenuecat-oauth]";

export type RevenueCatOAuthEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type RevenueCatOAuthEnvDiagnostics = {
  clientIdLength: number;
  clientSecretLength: number;
  redirectUri: string;
  clientIdSource: string | null;
  clientSecretSource: string | null;
  redirectUriSource: string | null;
  clientSecretFingerprint: string;
  clientSecretHadNewlines: boolean;
  clientSecretHadLeadingTrailingSpace: boolean;
};

export function revenueCatSecretFingerprint(secret: string): string {
  if (secret.length < 8) return `too_short(len=${secret.length})`;
  return `${secret.slice(0, 4)}...${secret.slice(-4)}(len=${secret.length})`;
}

function resolveEnvKey(
  primary: string,
  fallback: string,
): { value: string; source: string | null } {
  const p = process.env[primary];
  if (p != null && p !== "") {
    return { value: p, source: primary };
  }
  const f = process.env[fallback];
  if (f != null && f !== "") {
    return { value: f, source: fallback };
  }
  return { value: "", source: null };
}

function normalizeOAuthValue(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function normalizeClientSecret(raw: string | undefined): {
  secret: string;
  hadNewlines: boolean;
  hadEdgeSpace: boolean;
} {
  const original = raw ?? "";
  const hadEdgeSpace = original !== original.trim();
  const hadNewlines = /[\r\n]/.test(original);

  if (hadNewlines) {
    console.warn(
      `${LOG_PREFIX} REVENUE_CAT_CLIENT_SECRET contains a line break. ` +
        "Paste it as a single line in Heroku Config Vars. Auto-stripping newlines for this request.",
    );
  }

  const secret = original.trim().replace(/[\r\n]+/g, "");
  return { secret, hadNewlines, hadEdgeSpace };
}

export function getRevenueCatOAuthEnvDiagnostics(): RevenueCatOAuthEnvDiagnostics | null {
  const clientIdRaw = resolveEnvKey("REVENUE_CAT_CLIENT_ID", "REVENUECAT_CLIENT_ID");
  const redirectUriRaw = resolveEnvKey(
    "REVENUE_CAT_REDIRECT_URI",
    "REVENUECAT_REDIRECT_URI",
  );
  const clientSecretRaw = resolveEnvKey(
    "REVENUE_CAT_CLIENT_SECRET",
    "REVENUECAT_CLIENT_SECRET",
  );

  const clientId = normalizeOAuthValue(clientIdRaw.value);
  const redirectUri = normalizeOAuthValue(redirectUriRaw.value);
  const { secret, hadNewlines, hadEdgeSpace } = normalizeClientSecret(
    clientSecretRaw.value,
  );

  if (!clientId && !secret && !redirectUri) return null;

  return {
    clientIdLength: clientId.length,
    clientSecretLength: secret.length,
    redirectUri,
    clientIdSource: clientIdRaw.source,
    clientSecretSource: clientSecretRaw.source,
    redirectUriSource: redirectUriRaw.source,
    clientSecretFingerprint: revenueCatSecretFingerprint(secret),
    clientSecretHadNewlines: hadNewlines,
    clientSecretHadLeadingTrailingSpace: hadEdgeSpace,
  };
}

export function logRevenueCatOAuthEnvDiagnostics(context: string) {
  const d = getRevenueCatOAuthEnvDiagnostics();
  if (!d) {
    console.error(`${LOG_PREFIX} ${context}: OAuth env vars missing`);
    return;
  }

  console.info(
    `${LOG_PREFIX} ${context}:`,
    JSON.stringify({
      clientIdLength: d.clientIdLength,
      clientIdPrefix: process.env.REVENUE_CAT_CLIENT_ID?.trim().slice(0, 6) ?? "",
      clientIdSource: d.clientIdSource,
      clientSecretLength: d.clientSecretLength,
      clientSecretFingerprint: d.clientSecretFingerprint,
      clientSecretSource: d.clientSecretSource,
      clientSecretHadNewlines: d.clientSecretHadNewlines,
      clientSecretHadLeadingTrailingSpace: d.clientSecretHadLeadingTrailingSpace,
      redirectUri: d.redirectUri,
      redirectUriSource: d.redirectUriSource,
    }),
  );
}

export function getRevenueCatOAuthEnv(): RevenueCatOAuthEnv {
  const clientId = normalizeOAuthValue(
    resolveEnvKey("REVENUE_CAT_CLIENT_ID", "REVENUECAT_CLIENT_ID").value,
  );
  const redirectUri = normalizeOAuthValue(
    resolveEnvKey("REVENUE_CAT_REDIRECT_URI", "REVENUECAT_REDIRECT_URI").value,
  );
  const { secret: clientSecret } = normalizeClientSecret(
    resolveEnvKey("REVENUE_CAT_CLIENT_SECRET", "REVENUECAT_CLIENT_SECRET").value,
  );

  return { clientId, clientSecret, redirectUri };
}

export function isRevenueCatOAuthConfigured(): boolean {
  const { clientId, clientSecret, redirectUri } = getRevenueCatOAuthEnv();
  return Boolean(clientId && clientSecret && redirectUri);
}
