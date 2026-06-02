const emails = [
  "@gmail",
  "@yahoo",
  "@outlook",
  "@hotmail",
  "@icloud",
  "@proton",
  "@aol",
  "@edu",
];

const socialMedia = [
  "linkedin",
  "instagram",
  "insta",
  "ig:",
  "telegram",
  "whatsapp",
  "discord",
  "snapchat",
  "facebook",
  "reddit",
  "twitter",
  "x.com",
  "tiktok",
  "wechat",
  "signal",
];

const phoneIndicators = [
  "call me",
  "text me",
  "sms",
  "phone number",
  "cell number",
  "mobile number",
  "contact me",
  "find me",
  "reach me",
  "get at me",
  "get in touch"
];

const p2pWallets = [
  "wise",
  "revolut",
  "apple pay",
  "google pay",
  "chime",
  "bank transfer",
  "ach",
  "iban",
  "routing number",
  "cash app",
  "venmo",
  "zelle",
  "paypal",
  "bank account"
];

const crypto = [
  "bitcoin",
  "btc",
  "ethereum",
  "usdt",
  "crypto wallet",
  "metamask",
];

const contactPatterns = [
  "my number is",
  "here's my number",
  "heres my number",
  "whatsapp me",
  "dm me",
  "add me on",
  "hit me up on",
  "find me on",
  "send me your number",
  "what's your number",
  "whats your number",
  "email me",
  "message me on",
  "contact me at",
  "reach me at",
];

const linkPatterns = [
  "wa.me",
  "t.me",
  "telegram.me",
  "discord.gg",
];

const feeAvoidance = [
  "off platform",
  "off-app",
  "off app",
  "outside the app",
  "outside the platform",
  "avoid fees",
  "skip the fee",
  "save on fees",
  "no platform fee",
  "without the fee",
  "bypass",
  "deal off",
  "direct payment",
  "pay directly",
  "wire transfer",
];

const externalComms = [
  "facetime",
  "google meet",
  "zoom call",
];

const potentialCircumventionPhrases = [
  ...feeAvoidance,
  ...p2pWallets,
  ...crypto,
  ...contactPatterns,
  ...linkPatterns,
  ...externalComms,
];

const concatLists = (lists: string[][]) => lists.flat();

const prohibitedGeneralChatList = concatLists([
  potentialCircumventionPhrases,
  phoneIndicators,
  socialMedia,
  emails,
]);

const KNOWN_EMAIL_DOMAINS = [
  "gmail",
  "googlemail",
  "yahoo",
  "outlook",
  "hotmail",
  "icloud",
  "proton",
  "protonmail",
  "aol",
  "live",
  "msn",
];

const STANDARD_EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const KNOWN_PROVIDER_EMAIL_RE = new RegExp(
  `[a-z0-9._%+-]+@(?:${KNOWN_EMAIL_DOMAINS.join("|")})(?:\\.[a-z]{2,})?\\b`,
  "i",
);

/** Collapse tricks like `michael @ gmail . com` or `name at gmail dot com`. */
function normalizeForEmailDetection(text: string): string {
  let s = text.toLowerCase();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/\bdot\b/g, ".");
  s = s.replace(/\s*@\s*/g, "@");
  s = s.replace(/\s*\.\s*/g, ".");
  const domainAlt = KNOWN_EMAIL_DOMAINS.join("|");
  s = s.replace(
    new RegExp(`\\b([a-z0-9._%+-]+)\\s+at\\s+(${domainAlt})\\b`, "gi"),
    "$1@$2",
  );
  return s;
}

const responseIncludesEmail = (response: string) => {
  const normalized = normalizeForEmailDetection(response);

  if (STANDARD_EMAIL_RE.test(response) || STANDARD_EMAIL_RE.test(normalized)) {
    return true;
  }

  if (KNOWN_PROVIDER_EMAIL_RE.test(normalized)) {
    return true;
  }

  // Spaced local @ provider, e.g. "michael @ gmail"
  if (
    /\b[a-z0-9._%+-]+\s*@\s*(?:gmail|yahoo|outlook|hotmail|icloud|proton|aol)\b/i.test(
      response,
    )
  ) {
    return true;
  }

  return false;
};

const responseIncludesPhone = (response: string) => {
  return /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/.test(response);
};

export const hasProhibitedGeneralChatList = (
  response: string,
  chatType: "general" | "postSale",
) => {
  if (chatType === "postSale") {
    return false;
  }

  const hasEmailIndicators = responseIncludesEmail(response);
  const hasPhoneIndicators = responseIncludesPhone(response);
  const containsProhibitedPhrases = prohibitedGeneralChatList.some((phrase) =>
    response.toLowerCase().includes(phrase),
  );

  return hasEmailIndicators || hasPhoneIndicators || containsProhibitedPhrases;
};
