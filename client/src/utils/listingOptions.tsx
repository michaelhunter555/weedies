import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";


// platform icons
import AppleIcon from '@mui/icons-material/Apple';
import AndroidIcon from '@mui/icons-material/Android';
import WebIcon from '@mui/icons-material/Web';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import WindowIcon from '@mui/icons-material/Window';
import ExtensionIcon from '@mui/icons-material/Extension';
import type { ListingCategory, Platforms } from "../../types";
import { BRAND_PALETTE } from "@/theme/brand-palette";

export type { ListingCategory };

/** Legacy slugs → current taxonomy (e.g. listings saved as `design`). */
const LEGACY_CATEGORY_ALIASES: Record<string, ListingCategory> = {
  design: "service",
};

const LISTING_CATEGORY_VALUES: ListingCategory[] = [
  "ai-tools",
  "productivity",
  "games",
  "dev-tools",
  "extensions",
  "service",
  "saas",
  "marketplace",
];

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  "ai-tools": "AI tools",
  productivity: "Productivity",
  games: "Games",
  "dev-tools": "Dev tools",
  extensions: "Extensions",
  service: "Services",
  saas: "SaaS",
  marketplace: "Marketplace",
};

/** Human-readable label for chips, cards, and dashboards. */
export function getCategoryLabel(raw?: string | null): string {
  const normalized = normalizeListingCategorySlug(raw);
  if (normalized) return CATEGORY_LABELS[normalized];
  if (!raw?.trim()) return "App";
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type ListingDifficulty = "beginner" | "intermediate" | "advanced";

export type ListingTurnaround = "24h" | "3d" | "1w" | "2w" | "1m";

/**
 * Metadata used when rendering a category title/subtitle on discovery pages.
 * Keyed by URL slug (including `new` for the Fresh drops page).
 */
export const CATEGORY_META: Record<string, { title: string; subtitle: string }> = {
  "ai-tools": {
    title: "AI Tools",
    subtitle: "Assistants, copilots and agent-powered apps.",
  },
  productivity: {
    title: "Productivity",
    subtitle: "Ship more, stress less - apps that give you back your time.",
  },
  games: {
    title: "Games",
    subtitle: "Weekend-sized games from indie builders.",
  },
  "dev-tools": {
    title: "Dev Tools",
    subtitle: "Boilerplates, CLIs and utilities for shippers.",
  },
  extensions: {
    title: "Extensions",
    subtitle: "Browser and editor extensions the community loves.",
  },
  service: {
    title: "Services",
    subtitle: "Agencies, consulting, and done-for-you digital services.",
  },
  saas: {
    title: "SaaS",
    subtitle: "Subscription software with recurring revenue.",
  },
  marketplace: {
    title: "Marketplace",
    subtitle: "Two-sided platforms, directories, and app stores.",
  },
  /** @deprecated Use `service` — kept for old URLs/bookmarks. */
  design: {
    title: "Services",
    subtitle: "Agencies, consulting, and done-for-you digital services.",
  },
  new: {
    title: "Fresh drops",
    subtitle: "Apps that launched in the last 7 days.",
  },
};

/**
 * The chips shown on the homepage hero and on the listing form.
 * Keep these in sync so buyers and sellers see the same taxonomy.
 */
export const LISTING_CATEGORIES: {
  label: string;
  value: ListingCategory;
  icon: React.ReactElement;
}[] = [
  { label: "AI Tools", value: "ai-tools", icon: <AutoAwesomeIcon fontSize="small" /> },
  { label: "Productivity", value: "productivity", icon: <BoltRoundedIcon fontSize="small" /> },
  { label: "Games", value: "games", icon: <SportsEsportsRoundedIcon fontSize="small" /> },
  { label: "Dev Tools", value: "dev-tools", icon: <TerminalRoundedIcon fontSize="small" /> },
  { label: "Extensions", value: "extensions", icon: <ExtensionRoundedIcon fontSize="small" /> },
  { label: "Services", value: "service", icon: <HandymanRoundedIcon fontSize="small" /> },
  { label: "SaaS", value: "saas", icon: <CloudRoundedIcon fontSize="small" /> },
  { label: "Marketplace", value: "marketplace", icon: <StorefrontRoundedIcon fontSize="small" /> },
];

export function normalizeListingCategorySlug(
  raw?: string | null,
): ListingCategory | null {
  const slug = String(raw ?? "").trim();
  if (!slug) return null;
  const normalized = LEGACY_CATEGORY_ALIASES[slug] ?? slug;
  return LISTING_CATEGORY_VALUES.includes(normalized as ListingCategory)
    ? (normalized as ListingCategory)
    : null;
}

export const TURNAROUND_OPTIONS: {
  label: string;
  value: ListingTurnaround;
  hint: string;
}[] = [
  { label: "24 hours", value: "24h", hint: "Already packaged and ready." },
  { label: "3 days", value: "3d", hint: "Quick cleanup + docs." },
  { label: "1 week", value: "1w", hint: "Code review + handoff guide." },
  { label: "2 weeks", value: "2w", hint: "Full credential + infra transfer." },
  { label: "1 month", value: "1m", hint: "Complex migration with support." },
];

export const DIFFICULTY_OPTIONS: {
  value: ListingDifficulty;
  label: string;
  summary: string;
  details: string;
  icon: React.ReactElement;
}[] = [
  {
    value: "beginner",
    label: "Beginner friendly",
    summary: "No code changes needed to run.",
    details:
      "New owner can launch and operate with no technical background - just follow the README.",
    icon: <SchoolRoundedIcon />,
  },
  {
    value: "intermediate",
    label: "Intermediate",
    summary: "Some technical knowledge required.",
    details:
      "New owner should be comfortable with env vars, deployments, and basic JS/Python edits.",
    icon: <TuneRoundedIcon />,
  },
  {
    value: "advanced",
    label: "Advanced",
    summary: "In-depth technical knowledge required.",
    details:
      "Managing and modifying this app requires hands-on experience with the stack, infra, and architecture.",
    icon: <WorkspacePremiumRoundedIcon />,
  },
];

/**
 * Success-fee tiers applied when a listing sells (buyer checkout uses the same
 * logic on the server in `backend/lib/listing-asset-sale-fee.ts`).
 */
export type ApplicationFeeTier = {
  /** Inclusive lower bound in USD. */
  minPrice: number;
  /** Exclusive upper bound in USD, or null for no cap. */
  maxPrice: number | null;
  /** Platform fee as a fraction of sale price (0.1 = 10%). */
  rate: number;
  /** Human-readable price band for tables. */
  priceRangeLabel: string;
};

export const APPLICATION_FEE_TIERS: ApplicationFeeTier[] = [
  {
    minPrice: 0,
    maxPrice: 50,
    rate: 0.2,
    priceRangeLabel: "Under $50",
  },
  {
    minPrice: 50,
    maxPrice: 1000,
    rate: 0.1,
    priceRangeLabel: "$50 – $999",
  },
  {
    minPrice: 1000,
    maxPrice: 10000,
    rate: 0.08,
    priceRangeLabel: "$1,000 – $9,999",
  },
  {
    minPrice: 10000,
    maxPrice: null,
    rate: 0.06,
    priceRangeLabel: "$10,000 and above",
  },
];

export function determineApplicationFee(startingPrice: number): number {
  const price = Math.max(0, Number(startingPrice) || 0);
  for (const tier of APPLICATION_FEE_TIERS) {
    if (price >= tier.minPrice && (tier.maxPrice == null || price < tier.maxPrice)) {
      return tier.rate;
    }
  }
  return APPLICATION_FEE_TIERS[APPLICATION_FEE_TIERS.length - 1].rate;
}

export function formatApplicationFeePercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Up-front listing fee. First {FREE_LISTINGS_COUNT} listings are free so new
 * sellers can try Dap & Flip risk-free; subsequent listings cost $2.99 each.
 */
export const FREE_LISTINGS_COUNT = 3;
export const FLAT_LISTING_FEE = 2.99;
export const PRIVATE_LISTING_FEE = 4.99;

export function freeListingsRemaining(totalListings: number | undefined): number {
  const n = Number(totalListings ?? 0);
  if (!Number.isFinite(n) || n < 0) return FREE_LISTINGS_COUNT;
  return Math.max(0, FREE_LISTINGS_COUNT - n);
}

export function isWithinFreeListingTier(totalListings: number | undefined): boolean {
  return freeListingsRemaining(totalListings) > 0;
}

export const computeListingFee = (
  totalListings: number | undefined,
  isPrivateListing?: boolean,
): number => {
  const n = Number(totalListings ?? 0);
  const base =
    !Number.isFinite(n) || n < FREE_LISTINGS_COUNT ? 0 : FLAT_LISTING_FEE;
  const privateAddon = isPrivateListing ? PRIVATE_LISTING_FEE : 0;
  return base + privateAddon;
};


/** Platform checkboxes on the listing form (values match API / `Platforms` type). */
export type PlatformMap = {
  value: Platforms;
  label: string;
  icon: React.ReactElement;
  checkedIcon: React.ReactElement;
  iconCard: React.ReactElement;
};

export const PLATFORM_MAPPING: PlatformMap[] = [
  {
    value: "ios",
    label: "iOS",
    icon: <AppleIcon />,
    checkedIcon: <AppleIcon sx={{ color: BRAND_PALETTE.seafoam }} />,
    iconCard: <AppleIcon sx={{ fontSize: 14, color: "#000000" }} />,
  },
  {
    value: "android",
    label: "Android",
    icon: <AndroidIcon />,
    iconCard: <AndroidIcon sx={{ fontSize: 14, color:  "#3DDC84" }} />,
    checkedIcon: <AndroidIcon sx={{ color: BRAND_PALETTE.seafoam }} />,
  },
  {
    value: "web",
    label: "Web",
    icon: <WebIcon />,
    iconCard: <WebIcon sx={{ fontSize: 14, color: "#888" }} />,
    checkedIcon: <WebIcon sx={{ color: BRAND_PALETTE.seafoam }} />,
  },
  {
    value: "macOs",
    label: "macOS",
    icon: <LaptopMacIcon />,
    iconCard: <LaptopMacIcon sx={{ fontSize: 14, color: "#000" }} />,
    checkedIcon: <LaptopMacIcon sx={{ color: BRAND_PALETTE.seafoam }} />,
  },
  {
    value: "windows",
    label: "WindowsOS",
    icon: <WindowIcon />,
    iconCard: <WindowIcon sx={{ fontSize: 14, color: "#0078D7" }} />,
    checkedIcon: <WindowIcon sx={{ color: BRAND_PALETTE.seafoam }} />,
  },
  {
    value: "chromeExtension",
    label: "Chrome ext.",
    icon: <ExtensionIcon />,
    iconCard: <ExtensionIcon sx={{ fontSize: 14, color: "#4285F4" }} />,
    checkedIcon: <ExtensionIcon sx={{ color: BRAND_PALETTE.seafoam }} />,
  },
];

export {
  LISTING_APP_NAME_MIN,
  LISTING_APP_NAME_MAX,
  LISTING_TAGLINE_MIN,
  LISTING_TAGLINE_MAX,
  isListingAppNameValid,
  isListingTaglineValid,
  listingFieldCharCountLabel,
} from "@/lib/listing-field-limits";