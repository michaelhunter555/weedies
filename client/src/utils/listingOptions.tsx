import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

export type ListingCategory =
  | "ai-tools"
  | "productivity"
  | "games"
  | "dev-tools"
  | "design"
  | "extensions";

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
    subtitle: "Ship more, stress less — apps that give you back your time.",
  },
  games: {
    title: "Games",
    subtitle: "Weekend-sized games from indie builders.",
  },
  "dev-tools": {
    title: "Dev Tools",
    subtitle: "Boilerplates, CLIs and utilities for shippers.",
  },
  design: {
    title: "Design",
    subtitle: "Palettes, moodboards and design copilots.",
  },
  extensions: {
    title: "Extensions",
    subtitle: "Browser and editor extensions the community loves.",
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
  { label: "Design", value: "design", icon: <PaletteRoundedIcon fontSize="small" /> },
  { label: "Extensions", value: "extensions", icon: <ExtensionRoundedIcon fontSize="small" /> },
];

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
      "New owner can launch and operate with no technical background — just follow the README.",
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
 * VibeStack's success-fee rate applied to the sale price once the app sells.
 * Tiered so expensive listings keep more of their revenue.
 */
export const determineApplicationFee = (startingPrice: number): number => {
  if (startingPrice < 500) return 0.2;
  if (startingPrice < 1000) return 0.15;
  if (startingPrice < 10000) return 0.1;
  if (startingPrice < 50000) return 0.08;
  return 0.05;
};

/**
 * Up-front listing fee. First listing is on the house so new sellers can try
 * VibeStack risk-free; subsequent listings cost a flat $2.99 each.
 */
export const FLAT_LISTING_FEE = 2.99;

export const computeListingFee = (totalListings: number | undefined): number => {
  const n = Number(totalListings ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return FLAT_LISTING_FEE;
};
