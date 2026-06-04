import { Checkbox, Stack, Typography } from "@mui/material";
import { Platforms } from "../../../types";
import { PLATFORM_MAPPING } from "@/utils/listingOptions";

interface IPlatformCheckbox {
  selectedPlatforms?: Platforms[];
  onCheckSelection: (platform: Platforms) => void;
}

export const PlatformCheckbox = ({
  selectedPlatforms,
  onCheckSelection,
}: IPlatformCheckbox) => {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={2}
      sx={{ rowGap: 1.5 }}
    >
      {PLATFORM_MAPPING.map((platform) => {
        const checked = selectedPlatforms?.includes(platform.value) ?? false;
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
};
