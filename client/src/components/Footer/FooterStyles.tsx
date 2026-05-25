"use client";

import { styled } from "@mui/material/styles";

export const FooterStyles = styled("footer")(({ theme }) => ({
  display: "flex",
  justifyContent: "stretch",
  alignItems: "center",
  backgroundColor: theme.palette.background.paper,
  borderRadius: "6px 6px 0px 0px",
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(2, 2.5),
  width: "100%",
}));

type PageContainer = {
  minHeight?: number | string;
};

export const PageContainer = styled("div", {
  shouldForwardProp: (prop) => prop !== "minHeight",
})<PageContainer>(({ theme, minHeight }) => ({
  minHeight: minHeight ? minHeight : "100vh",
  display: "flex",
  flexDirection: "column",
  overflowX: "hidden",
  maxWidth: "100vw",
}));

export const Content = styled("div")(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  overflowX: "hidden",
}));
