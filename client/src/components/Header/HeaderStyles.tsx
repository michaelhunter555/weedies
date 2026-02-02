"use client";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { styled } from "@mui/material/styles";

type HeaderProps = {
  isMobile: boolean;
};

export const StyledContainer = styled(Container, {
  shouldForwardProp: (prop) => prop !== "isMobile",
})<HeaderProps>(({ theme, isMobile }) => ({
  width: "100%",
  ...(isMobile && {
    display: "flex",
    flexDirection: "row",
    gap: 1,
    alignItems: "start",
  }),
}));

export const StyledBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  mb: 2,
  backgroundColor: "fff",
  gap: "5px",
  [theme.breakpoints.down("sm")]: {
    display: "none",
  },
}));
