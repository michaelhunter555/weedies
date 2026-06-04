"use client";

import {
  Box,
  Divider,
  Stack,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";

import { PLATFORM_MAPPING } from "@/utils/listingOptions";
import type { Platforms } from "../../../types";

export type ListingPlatformsRowSize = "card" | "detail";

const SIZE_STYLES: Record<
  ListingPlatformsRowSize,
  {
    minWidth: number;
    labelFontSize: number;
    iconFontSize: number;
    dividerHeight: number;
    stackSpacing: number;
    showHeading: boolean;
  }
> = {
  card: {
    minWidth: 40,
    labelFontSize: 8,
    iconFontSize: 14,
    dividerHeight: 20,
    stackSpacing: 0.5,
    showHeading: false,
  },
  detail: {
    minWidth: 56,
    labelFontSize: 11,
    iconFontSize: 24,
    dividerHeight: 28,
    stackSpacing: 0.75,
    showHeading: true,
  },
};

export type ListingPlatformsRowProps = {
  platforms?: Platforms[] | null;
  size?: ListingPlatformsRowSize;
  /** Tooltip on each platform icon (product detail page). */
  showTooltips?: boolean;
  sx?: SxProps<Theme>;
};

function PlatformIconDisplay({
  children,
  fontSize,
}: {
  children: React.ReactNode;
  fontSize: number;
}) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
        color: "inherit",
        "& svg": { fontSize },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Row of platform icons + labels (same pattern as product cards, scalable via `size`).
 */
export function ListingPlatformsRow({
  platforms,
  size = "card",
  showTooltips = true,
  sx,
}: ListingPlatformsRowProps) {
  const styles = SIZE_STYLES[size];
  const available = PLATFORM_MAPPING.filter(
    (p) => platforms?.includes(p.value) && p.iconCard,
  );

  if (available.length === 0) return null;

  return (
    <Stack spacing={0.75} sx={sx}>
      {styles.showHeading ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: 0.2 }}
        >
          Currently launched on the following platform(s):
        </Typography>
      ) : null}
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        {available.map((platform, platformIndex) => {
          const icon = (
            <PlatformIconDisplay fontSize={styles.iconFontSize}>
              {platform.iconCard}
            </PlatformIconDisplay>
          );

          return (
            <Stack
              key={platform.value}
              direction="row"
              alignItems="center"
              spacing={0.5}
            >
              <Stack
                direction="column"
                alignItems="center"
                spacing={styles.stackSpacing}
                sx={{ minWidth: styles.minWidth }}
              >
                {showTooltips ? (
                  <Tooltip title={`Sale includes ${platform.label} version`}>
                    <span>{icon}</span>
                  </Tooltip>
                ) : (
                  icon
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: styles.labelFontSize, lineHeight: 1.2 }}
                >
                  {platform.label}
                </Typography>
              </Stack>
              {platformIndex < available.length - 1 ? (
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ height: styles.dividerHeight, alignSelf: "center" }}
                />
              ) : null}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
