"use client";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { styled } from "@mui/material/styles";

type HeaderProps = {
  compactNav: boolean;
};

export const StyledContainer = styled(Container, {
  shouldForwardProp: (prop) => prop !== "compactNav",
})<HeaderProps>(({ compactNav }) => ({
  width: "100%",
  minWidth: 0,
  ...(compactNav && {
    display: "flex",
    flexDirection: "row",
    gap: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  }),
}));

export const StyledBox = styled(Box)(() => ({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  mb: 2,
  backgroundColor: "fff",
  gap: "5px",
}));
