"use client";

import { Alert, Box, Stack, Typography } from "@mui/material";

import {
  OWNERSHIP_VERIFICATION_FILE_NAME,
  OWNERSHIP_VERIFICATION_WELL_KNOWN_DIR,
  OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH,
} from "@/lib/ownership-verification";

type Props = {
  variant?: "compact" | "full";
};

/**
 * Clarifies that `.well-known` is a folder, not a filename, and that sellers
 * add one new file alongside any existing well-known assets (Expo, AASA, etc.).
 */
export function WellKnownPlacementExplainer({ variant = "full" }: Props) {
  if (variant === "compact") {
    return (
      <Typography variant="body2" color="text.secondary">
        Add a new file named{" "}
        <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          {OWNERSHIP_VERIFICATION_FILE_NAME}
        </Box>{" "}
        inside your existing{" "}
        <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          {OWNERSHIP_VERIFICATION_WELL_KNOWN_DIR}
        </Box>{" "}
        folder (do not create a second folder).
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <Typography variant="body2" component="div" sx={{ mb: 1 }}>
          <strong>{OWNERSHIP_VERIFICATION_WELL_KNOWN_DIR}</strong> is a{" "}
          <strong>folder</strong> on your site, not a file name. You only need one of
          these folders at the root of your domain.
        </Typography>
        <Typography variant="body2" component="div">
          Slashes in{" "}
          <Box component="span" sx={{ fontFamily: "monospace" }}>
            {OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH}
          </Box>{" "}
          are URL path separators: site root, then the folder, then the file. You are
          not naming anything{" "}
          <Box component="span" sx={{ fontFamily: "monospace" }}>
            /.well-known/
          </Box>
          .
        </Typography>
      </Alert>

      <Box
        sx={{
          p: 1.5,
          borderRadius: 1,
          bgcolor: "grey.100",
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <Box component="div" color="text.secondary">
          https://yourdomain.com
          <Box component="span" color="text.primary" fontWeight={700}>
            /.well-known/
          </Box>
          <Box component="span" color="primary.main" fontWeight={700}>
            {OWNERSHIP_VERIFICATION_FILE_NAME}
          </Box>
        </Box>
        <Box component="div" sx={{ mt: 1, fontFamily: "inherit", fontSize: 12 }}>
          <Box component="span" color="text.secondary">
            domain
          </Box>
          {" · "}
          <Box component="span" color="text.primary">
            folder (already used by Expo, universal links, etc.)
          </Box>
          {" · "}
          <Box component="span" color="primary.main">
            new plain text file you add
          </Box>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary">
        <strong>Already have a {OWNERSHIP_VERIFICATION_WELL_KNOWN_DIR} folder?</strong>{" "}
        Common for Expo, Next.js, Vercel, and universal links. Keep{" "}
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          apple-app-site-association
        </Box>
        ,{" "}
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          assetlinks.json
        </Box>
        , and your other files as they are. Add{" "}
        <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          {OWNERSHIP_VERIFICATION_FILE_NAME}
        </Box>{" "}
        as a <strong>separate</strong> file in that same folder. Do not paste our token
        into those JSON files and do not create a second{" "}
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          {OWNERSHIP_VERIFICATION_WELL_KNOWN_DIR}
        </Box>{" "}
        folder.
      </Typography>
    </Stack>
  );
}
