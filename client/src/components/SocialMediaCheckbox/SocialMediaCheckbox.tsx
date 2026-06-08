import { Checkbox, Stack, Typography } from "@mui/material";

import { SOCIAL_MEDIA_MAPPING } from "@/utils/listingOptions";
import type { SocialMediaPlatform } from "../../../types";

interface SocialMediaCheckboxProps {
  selected?: SocialMediaPlatform[];
  onCheckSelection: (platform: SocialMediaPlatform) => void;
}

export function SocialMediaCheckbox({
  selected,
  onCheckSelection,
}: SocialMediaCheckboxProps) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={2}
      sx={{ rowGap: 1.5 }}
    >
      {SOCIAL_MEDIA_MAPPING.map((platform) => {
        const checked = selected?.includes(platform.value) ?? false;
        return (
          <Stack
            key={platform.value}
            alignItems="center"
            spacing={0.25}
            sx={{ width: 72 }}
          >
            <Checkbox
              icon={platform.icon}
              checkedIcon={platform.checkedIcon}
              checked={checked}
              onChange={() => onCheckSelection(platform.value)}
              inputProps={{
                "aria-label": platform.label,
              }}
              sx={{ p: 0.5 }}
            />
            <Typography
              variant="caption"
              color={checked ? "primary" : "text.secondary"}
              textAlign="center"
              lineHeight={1.2}
              sx={{ fontSize: "0.65rem", maxWidth: 72 }}
            >
              {platform.label}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
