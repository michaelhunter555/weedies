"use client";

import { styled } from "@mui/material/styles";

export const FooterStyles = styled("footer")(({ theme }) => ({
  display: "flex",
  justifyContent: "stretch",
  alignItems: "center",
  backgroundColor: theme.palette.background.paper,
  borderRadius: "6px 6px 0px 0px",
  flexShrink: 0,
  padding: theme.spacing(2, 2.5),
  width: "100%",
}));

type PageContainer = {
  minHeight?: number | string;
};

export const PageContainer = styled("div", {
  shouldForwardProp: (prop) => prop !== "minHeight",
})<PageContainer>(({ theme, minHeight }) => ({
  minHeight: minHeight ? minHeight : "100dvh",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  overflowX: "clip",
}));

export const Content = styled("main")(({ theme }) => ({
  // Grow on short pages (footer at bottom) but never shrink below content height —
  // `flex: 1` alone sizes this to the viewport and causes scroll-within-scroll.
  flex: "1 0 auto",
  minWidth: 0,
  width: "100%",
}));
