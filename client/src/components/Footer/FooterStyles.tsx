"use client";

import { styled } from "@mui/material/styles";

export const FooterStyles = styled("footer")(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-start",
  gap: "5px",
  backgroundColor: theme.palette.background.paper,
  flexDirection: "row",
  borderRadius: "6px 6px 0px 0px",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "2rem 2rem",
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
}));

export const Content = styled("div")(({ theme }) => ({
  flex: 1,
}));
