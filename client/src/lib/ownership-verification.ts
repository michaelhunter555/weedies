import { APP_NAME } from "@/brand";
import type { Platforms } from "../../types";

/** Folder at the site root (one per domain). Not a filename. */
export const OWNERSHIP_VERIFICATION_WELL_KNOWN_DIR = ".well-known";

export const OWNERSHIP_VERIFICATION_FILE_NAME =
  "dap-and-flip-app-verification.txt";

/** Full URL path: root slash + folder + file. Slashes are path separators only. */
export const OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH =
  `/.well-known/${OWNERSHIP_VERIFICATION_FILE_NAME}`;

export const STORE_LISTING_CODE_PREFIX = "DAPANDFLIP-VERIFY-";

export type OwnershipVerificationGuideMethod =
  | "web_well_known"
  | "website_required"
  | "native_store_listing"
  | "native_use_website";

export type OwnershipVerificationPlatformGuide = {
  platform: Platforms;
  label: string;
  method: OwnershipVerificationGuideMethod;
  storeListingUrl?: string;
};

export type StoreListingUrlTargets = {
  ios?: string;
  android?: string;
};

export type OwnershipVerifiedVia = "well_known" | "store_listing";

export type OwnershipVerificationPayload = {
  listingId: string;
  appName: string;
  platforms: Platforms[];
  webOrigin: string | null;
  verificationCheckUrl: string | null;
  verificationToken: string;
  storeListingCode: string;
  storeListingUrls: StoreListingUrlTargets;
  isVerified: boolean;
  verifiedVia: OwnershipVerifiedVia | null;
  dateVerified: string | Date | null;
  wellKnownPath: string;
  fileName: string;
  platformGuides: OwnershipVerificationPlatformGuide[];
};

export type OwnershipVerificationCheckMethod = OwnershipVerifiedVia;

export type OwnershipVerificationCheckResponse = {
  ok: boolean;
  isVerified: boolean;
  alreadyVerified?: boolean;
  method?: OwnershipVerificationCheckMethod;
  verifiedVia?: OwnershipVerifiedVia;
  checkedUrl?: string;
  checkedUrls?: string[];
  dateVerified?: string | Date | null;
  message: string;
};

export function ownershipVerificationFileContents(token: string): string {
  return token.trim();
}

export function ownershipVerificationSummary(): string {
  return `Prove you control the app by hosting a verification file on your website, or by adding a short code to your App Store or Play Store listing.`;
}

export function listingHasStoreVerificationOption(platforms: Platforms[]): boolean {
  return platforms.includes("ios") || platforms.includes("android");
}

const NATIVE_STORE_NOTES: Partial<Record<Platforms, string>> = {
  macOs:
    "The Mac App Store does not host custom verification files. Host the file on a website tied to your app.",
  windows:
    "The Microsoft Store does not host custom verification files. Host the file on a website tied to your app.",
  chromeExtension:
    "The Chrome Web Store does not host custom verification files. Use your extension's website or support page.",
  other:
    "App stores and marketplaces cannot host this file. Use a website you control and link it on your listing.",
};

export function nativePlatformOwnershipNote(platform: Platforms): string {
  return (
    NATIVE_STORE_NOTES[platform] ??
    "Host the verification file on a website you control and link that site on your listing."
  );
}

export const STORE_LISTING_PLACEMENT_FIELDS = [
  "App description",
  "What's New / release notes",
  "Promotional text (iOS)",
  "Developer website page linked from the store",
] as const;
