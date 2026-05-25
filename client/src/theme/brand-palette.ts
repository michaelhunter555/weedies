import type { SxProps, Theme } from "@mui/material/styles";

/** Dap & Flip brand colors — solids only (no gradients). */
export const BRAND_PALETTE = {
  /** Light surface — readable text backgrounds (listing form, settings, hero) */
  mint: "#f4fff8",
  sage: "#c4e0d3",
  seafoam: "#8fb6aa",
  charcoal: "#25343a",
  charcoalHover: "#1a262b",
  border: "#c4e0d3",
  borderSubtle: "#ececec",
  onPrimary: "#ffffff",
  /** Listing form (`/products?list=new`) — lighter than mint, not pure white */
  listFormSurface: "#fafefb",
  listFormField: "rgba(255, 255, 255, 0.52)",
  listFormPanel: "rgba(255, 255, 255, 0.38)",
} as const;

/** Outlined inputs on the listing form */
export const listFormOutlinedFieldSx: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: BRAND_PALETTE.listFormField,
    borderRadius: 2,
  },
};

/** Solid icon backgrounds for dashboard stat cards */
export const BRAND_STAT_TINTS = {
  listings: BRAND_PALETTE.seafoam,
  sales: BRAND_PALETTE.charcoal,
  messages: BRAND_PALETTE.seafoam,
} as const;

/** Primary contained actions — high contrast charcoal on white */
export const brandContainedButtonSx: SxProps<Theme> = {
  borderRadius: 999,
  textTransform: "none",
  fontWeight: 700,
  color: BRAND_PALETTE.onPrimary,
  backgroundColor: BRAND_PALETTE.charcoal,
  boxShadow: "none",
  "&:hover": {
    backgroundColor: BRAND_PALETTE.charcoalHover,
    boxShadow: "none",
  },
};

export const brandLogoMarkSx: SxProps<Theme> = {
  backgroundColor: BRAND_PALETTE.seafoam,
  border: `1px solid ${BRAND_PALETTE.sage}`,
  color: BRAND_PALETTE.onPrimary,
};

export const brandSelectedNavSx: SxProps<Theme> = {
  bgcolor: BRAND_PALETTE.mint,
  borderLeft: `3px solid ${BRAND_PALETTE.seafoam}`,
};

export const brandNavIconActiveColor = BRAND_PALETTE.seafoam;
