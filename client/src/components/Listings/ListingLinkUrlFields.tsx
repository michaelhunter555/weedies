"use client";

import {
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { stripPastedPrefix } from "@/lib/listing-link-urls";

type LinkFieldItem<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactElement;
  urlPrefix?: string;
};

export type ListingLinkUrlFieldsProps<T extends string> = {
  items: LinkFieldItem<T>[];
  selected: T[];
  urls: Partial<Record<T, string>>;
  onUrlChange: (platform: T, url: string) => void;
  required?: boolean;
};

export function ListingLinkUrlFields<T extends string>({
  items,
  selected,
  urls,
  onUrlChange,
  required = false,
}: ListingLinkUrlFieldsProps<T>) {
  const active = items.filter((item) => selected.includes(item.value));
  if (active.length === 0) return null;

  const hasPrefixed = active.some((item) => Boolean(item.urlPrefix));
  const hasFreeform = active.some((item) => !item.urlPrefix);

  return (
    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
      {active.map((item) => {
        const prefix = item.urlPrefix;
        const isPrefixed = Boolean(prefix);

        return (
          <TextField
            key={item.value}
            label={
              isPrefixed
                ? `${item.label} listing path${required ? "" : " (optional)"}`
                : `${item.label} URL${required ? "" : " (optional)"}`
            }
            placeholder={isPrefixed ? "app/your-app-id" : "https://"}
            value={urls[item.value] ?? ""}
            onChange={(e) =>
              onUrlChange(
                item.value,
                stripPastedPrefix(prefix, e.target.value),
              )
            }
            sx={{ 
              "& .MuiInputBase-root": {
                color: "text.secondary",
                variant: "caption"
              },
            }}
            required={required}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    {item.icon ? (
                      <Stack sx={{ lineHeight: 0 }}>{item.icon}</Stack>
                    ) : null}
                    {isPrefixed ? (
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          whiteSpace: "nowrap",
                          maxWidth: { xs: 140, sm: "none" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {prefix}
                      </Typography>
                    ) : null}
                  </Stack>
                </InputAdornment>
              ),
            }}
          />
        );
      })}
      <Typography variant="caption" color="text.secondary">
        {hasPrefixed && hasFreeform
          ? "Store and profile links use a fixed domain — enter only the path after it. Web and Other accept a full URL."
          : hasPrefixed
            ? "Enter only the path after the fixed store or profile domain (for example app/your-app-id)."
            : required
              ? "Add the public store or live link for each selected platform."
              : "Optional links shown on your product page when provided."}
      </Typography>
    </Stack>
  );
}
