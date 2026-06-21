"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { BRAND_PALETTE } from "./brand-palette";

export const appTheme = createTheme({
  palette: {
    primary: {
      main: BRAND_PALETTE.charcoal,
      dark: BRAND_PALETTE.charcoalHover,
      contrastText: BRAND_PALETTE.onPrimary,
    },
    secondary: {
      main: BRAND_PALETTE.seafoam,
      dark: "#6f9d92",
      contrastText: BRAND_PALETTE.onPrimary,
    },
    divider: BRAND_PALETTE.borderSubtle,
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: BRAND_PALETTE.charcoal,
      secondary: "rgba(37, 52, 58, 0.72)",
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          overflowX: "clip",
        },
        body: {
          margin: 0,
          overflowX: "clip",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        containedSecondary: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorSecondary: {
          backgroundColor: BRAND_PALETTE.mint,
          color: BRAND_PALETTE.charcoal,
        },
      },
    },
  },
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
