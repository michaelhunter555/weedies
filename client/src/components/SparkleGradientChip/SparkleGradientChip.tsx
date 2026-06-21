"use client";

import QuickreplyIcon from '@mui/icons-material/Quickreply';
import Chip, { type ChipProps } from "@mui/material/Chip";
import { styled } from "@mui/material/styles";

const SparkleGradientChip = styled(Chip)(() => ({
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#ffffff",
  color: "#1976d2",
  fontWeight: 500,
  fontSize: "0.8125rem",
  borderRadius: 999,
  borderStyle: "solid",
  borderWidth: "1px 1px 2.5px",
  borderColor: "rgba(223, 226, 231, 0.8)",
  cursor: "pointer",
  boxShadow: "none",
  transition: "120ms ease-in",

  // Match the MUI docs approach: layered backgrounds clipped to padding/border.
  backgroundSize: "200%",
  backgroundClip: "padding-box, border-box, border-box",
  backgroundOrigin: "border-box",
  "--bg-color-raw": "255, 255, 255",
  "--bg-color": "rgb(var(--bg-color-raw))",
  "--color-1": "0 100% 50%",
  "--color-2": "270 100% 50%",
  "--color-3": "210 100% 50%",
  "--color-4": "195 100% 50%",
  "--color-5": "90 100% 50%",
  backgroundImage: `
    linear-gradient(var(--bg-color), var(--bg-color)),
    linear-gradient(var(--bg-color) 50%, rgba(var(--bg-color-raw), 0.8) 80%, rgba(var(--bg-color-raw), 0)),
    linear-gradient(
      90deg,
      hsl(var(--color-1)),
      hsl(var(--color-5)),
      hsl(var(--color-3)),
      hsl(var(--color-4)),
      hsl(var(--color-2))
    )
  `,
  animation: "chip-border-flow 2s linear infinite",

  "& .MuiChip-label, & .MuiChip-icon": {
    color: "#1976d2",
    fontWeight: 600,
  },

  "&:hover": {
    borderColor: "rgba(25, 118, 210, 0.28)",
    boxShadow: "0px 2px 8px rgba(0, 127, 255, 0.12)",
  },

  "@keyframes chip-border-flow": {
    "0%": { backgroundPosition: "0% 50%" },
    "100%": { backgroundPosition: "200% 50%" },
  },
}));

export default function CustomEditChatChip(props: ChipProps) {
  return (
    <SparkleGradientChip
      icon={<QuickreplyIcon fontSize="small" />}
      label="Message Seller"
      {...props}
    />
  );
}
