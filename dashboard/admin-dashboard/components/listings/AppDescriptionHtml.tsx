"use client";

import * as React from "react";
import Typography, { type TypographyProps } from "@mui/material/Typography";
import { sanitizeAppDescriptionHtml } from "@/lib/sanitize-html";

type Props = TypographyProps & {
  html: string;
  emptyFallback?: string;
};

const descriptionSx = {
  "& p": { margin: "0 0 0.75em" },
  "& p:last-child": { marginBottom: 0 },
  "& ul, & ol": { paddingLeft: "1.5rem", margin: "0 0 0.75em" },
  "& h2": { fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5em" },
  "& h3": { fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5em" },
};

export function AppDescriptionHtml({
  html,
  emptyFallback = "—",
  sx,
  ...rest
}: Props) {
  const safe = React.useMemo(() => sanitizeAppDescriptionHtml(html), [html]);

  if (!safe) {
    return (
      <Typography color="text.secondary" sx={sx} {...rest}>
        {emptyFallback}
      </Typography>
    );
  }

  return (
    <Typography
      component="div"
      color="text.secondary"
      sx={{ ...descriptionSx, ...sx }}
      dangerouslySetInnerHTML={{ __html: safe }}
      {...rest}
    />
  );
}
