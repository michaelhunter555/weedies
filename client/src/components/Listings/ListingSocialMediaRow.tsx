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

import {
  normalizeSocialMediaList,
  normalizeSocialMediaPlatform,
} from "@/lib/listing-link-urls";
import { SOCIAL_MEDIA_MAPPING } from "@/utils/listingOptions";
import type { ListingSocialMediaUrl, SocialMediaPlatform } from "../../../types";

export type ListingSocialMediaRowSize = "card" | "detail";

const SIZE_STYLES: Record<
  ListingSocialMediaRowSize,
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

export type ListingSocialMediaRowProps = {
  socialMedia?: SocialMediaPlatform[] | null;
  socialMediaUrls?: ListingSocialMediaUrl[] | null;
  size?: ListingSocialMediaRowSize;
  /** Product detail only: icons open the stored public URL. */
  linkable?: boolean;
  showTooltips?: boolean;
  sx?: SxProps<Theme>;
};

function SocialIconDisplay({
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

function urlBySocial(
  socialMediaUrls?: ListingSocialMediaUrl[] | null,
): Map<SocialMediaPlatform, string> {
  const map = new Map<SocialMediaPlatform, string>();
  for (const entry of socialMediaUrls ?? []) {
    const url = entry.url?.trim();
    if (url) map.set(normalizeSocialMediaPlatform(String(entry.platform)), url);
  }
  return map;
}

export function ListingSocialMediaRow({
  socialMedia,
  socialMediaUrls,
  size = "detail",
  linkable = false,
  showTooltips = true,
  sx,
}: ListingSocialMediaRowProps) {
  const styles = SIZE_STYLES[size];
  const urls = urlBySocial(socialMediaUrls);
  const normalizedSocial = normalizeSocialMediaList(socialMedia ?? undefined);
  const available = SOCIAL_MEDIA_MAPPING.filter(
    (p) => normalizedSocial.includes(p.value) && p.iconCard,
  );
  const display = linkable
    ? available.filter((p) => urls.has(p.value))
    : available;

  if (display.length === 0) return null;

  return (
    <Stack spacing={0.75} sx={sx}>
      {styles.showHeading ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: 0.2 }}
        >
          Social media included with this listing:
        </Typography>
      ) : null}
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        {display.map((platform, platformIndex) => {
          const href = linkable ? urls.get(platform.value) : undefined;
          const iconNode = (
            <SocialIconDisplay fontSize={styles.iconFontSize}>
              {platform.iconCard}
            </SocialIconDisplay>
          );
          const icon = href ? (
            <Box
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{
                display: "inline-flex",
                color: "inherit",
                textDecoration: "none",
                borderRadius: 1,
                "&:hover": { opacity: 0.85 },
              }}
            >
              {iconNode}
            </Box>
          ) : (
            iconNode
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
                  <Tooltip
                    title={
                      href
                        ? `Open ${platform.label} page/channel`
                        : `${platform.label} included`
                    }
                  >
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
              {platformIndex < display.length - 1 ? (
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
