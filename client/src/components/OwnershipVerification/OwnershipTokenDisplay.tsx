"use client";

import { useState } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { ownershipVerificationFileContents } from "@/lib/ownership-verification";
import { WellKnownPlacementExplainer } from "./WellKnownPlacementExplainer";

type Props = {
  verificationToken: string;
  storeListingCode?: string;
  showStoreCode?: boolean;
};

export function OwnershipTokenDisplay({
  verificationToken,
  storeListingCode,
  showStoreCode = false,
}: Props) {
  const [copied, setCopied] = useState<"token" | "file" | "store" | null>(null);
  const fileBody = ownershipVerificationFileContents(verificationToken);

  const copy = async (value: string, kind: "token" | "file" | "store") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" fontWeight={800}>
        Website verification token
      </Typography>
      <WellKnownPlacementExplainer variant="compact" />
      <Typography variant="body2" color="text.secondary">
        The file should contain only your token on a single line. No quotes, JSON, or
        extra text.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50" }}>
        <Stack spacing={1.5}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Verification token
          </Typography>
          <TextField
            value={verificationToken}
            fullWidth
            multiline
            minRows={3}
            InputProps={{ readOnly: true, sx: { fontFamily: "monospace", fontSize: 13 } }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyRoundedIcon />}
            onClick={() => copy(verificationToken, "token")}
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            {copied === "token" ? "Copied" : "Copy token"}
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Full file contents
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "grey.100",
              fontSize: 13,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {fileBody}
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyRoundedIcon />}
            onClick={() => copy(fileBody, "file")}
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            {copied === "file" ? "Copied" : "Copy file contents"}
          </Button>
        </Stack>
      </Paper>

      {showStoreCode && storeListingCode ? (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight={800}>
            Store listing code (iOS / Android backup)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add this short code to your App Store or Play Store listing text. We fetch
            the public store page and look for an exact match.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50" }}>
            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Store verification code
              </Typography>
              <TextField
                value={storeListingCode}
                fullWidth
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: "monospace", fontSize: 15, fontWeight: 700 },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyRoundedIcon />}
                onClick={() => copy(storeListingCode, "store")}
                sx={{ alignSelf: "flex-start", textTransform: "none" }}
              >
                {copied === "store" ? "Copied" : "Copy store code"}
              </Button>
            </Stack>
          </Paper>
        </>
      ) : null}

      {copied ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Copied to clipboard.
        </Alert>
      ) : null}
    </Stack>
  );
}
