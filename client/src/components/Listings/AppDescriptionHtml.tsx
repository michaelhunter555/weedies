"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography, { type TypographyProps } from "@mui/material/Typography";
import {
  sanitizeAppDescriptionHtml,
  splitDescriptionLeadingPlain,
} from "@/lib/sanitize-html";

/** ~14–16 lines of body text; scroll for longer copy. */
export const APP_DESCRIPTION_DISPLAY_MAX_HEIGHT = 360;

type Props = TypographyProps & {
  html: string;
  emptyFallback?: string;
  /** Cap height and scroll when content is long (product page). */
  scrollable?: boolean;
};

const descriptionSx = {
  "& p": { margin: "0 0 0.75em" },
  "& p:last-child": { marginBottom: 0 },
  "& ul, & ol": { paddingLeft: "1.5rem", margin: "0 0 0.75em" },
  "& h2": { fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5em" },
  "& h3": { fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5em" },
  "& blockquote": {
    borderLeft: "3px solid",
    borderColor: "divider",
    pl: 2,
    ml: 0,
    color: "text.secondary",
  },
  "& code": {
    fontFamily: "monospace",
    fontSize: "0.9em",
    bgcolor: "action.hover",
    px: 0.5,
    borderRadius: 0.5,
  },
};

/** Renders server-sanitized listing description HTML. */
export function AppDescriptionHtml({
  html,
  emptyFallback = "—",
  scrollable = false,
  sx,
  ...rest
}: Props) {
  const safe = React.useMemo(() => sanitizeAppDescriptionHtml(html), [html]);
  const { leadingPlain, html: bodyHtml } = React.useMemo(
    () => splitDescriptionLeadingPlain(safe),
    [safe],
  );

  if (!safe) {
    return (
      <Typography color="text.secondary" sx={sx} {...rest}>
        {emptyFallback}
      </Typography>
    );
  }

  const content = (
    <>
      {leadingPlain ? (
        <Typography
          component="div"
          color="text.secondary"
          sx={{ whiteSpace: "pre-wrap", mb: bodyHtml ? 1 : 0 }}
        >
          {leadingPlain}
        </Typography>
      ) : null}
      {bodyHtml ? (
        <Typography
          component="div"
          color="text.secondary"
          sx={descriptionSx}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : null}
    </>
  );

  if (!scrollable) {
    return (
      <Box sx={sx} {...(rest as object)}>
        {content}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 0.5,
        maxHeight: APP_DESCRIPTION_DISPLAY_MAX_HEIGHT,
        overflowY: "auto",
        pr: 0.5,
        ...sx,
      }}
      {...(rest as object)}
    >
      {content}
    </Box>
  );
}
