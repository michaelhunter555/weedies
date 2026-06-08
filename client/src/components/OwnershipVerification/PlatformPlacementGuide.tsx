"use client";

import { useMemo, useState } from "react";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { APP_NAME } from "@/brand";
import {
  nativePlatformOwnershipNote,
  OWNERSHIP_VERIFICATION_FILE_NAME,
  OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH,
  STORE_LISTING_PLACEMENT_FIELDS,
  type OwnershipVerificationPlatformGuide,
} from "@/lib/ownership-verification";
import { WellKnownPlacementExplainer } from "./WellKnownPlacementExplainer";

type Props = {
  guides: OwnershipVerificationPlatformGuide[];
  webOrigin: string | null;
  verificationCheckUrl: string | null;
  storeListingCode: string;
};

function WellKnownSteps() {
  return (
    <Stack spacing={1.5}>
      <WellKnownPlacementExplainer />
      <Stack component="ol" spacing={1} sx={{ m: 0, pl: 2.5 }}>
        <Typography component="li" variant="body2" color="text.secondary">
          Create a plain text file named{" "}
          <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            {OWNERSHIP_VERIFICATION_FILE_NAME}
          </Box>
          .
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Paste your website verification token as the only line in that file.
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Put the file inside your site&apos;s{" "}
          <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            .well-known
          </Box>{" "}
          folder so the full URL is{" "}
          <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            {OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH}
          </Box>{" "}
          on your domain (public over HTTPS).
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Open that URL in a browser (or curl) to confirm it returns your token before
          running the check on {APP_NAME}.
        </Typography>
      </Stack>
    </Stack>
  );
}

function StoreListingGuidePanel({
  guide,
  storeListingCode,
}: {
  guide: OwnershipVerificationPlatformGuide;
  storeListingCode: string;
}) {
  const storeLabel = guide.platform === "ios" ? "App Store" : "Play Store";

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        You cannot verify an {guide.label} app by inspecting the binary. Instead,
        prove you can edit the public {storeLabel} listing by placing your store code
        where store visitors can read it.
      </Typography>

      {guide.storeListingUrl ? (
        <Link
          href={guide.storeListingUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            fontWeight: 600,
            wordBreak: "break-all",
          }}
        >
          {guide.storeListingUrl}
          <LaunchRoundedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
        </Link>
      ) : (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Add your {storeLabel} listing URL on this listing under Platforms so we know
          which page to check.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" fontWeight={700}>
        Your store code
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: "grey.100",
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {storeListingCode}
      </Box>

      <Typography variant="body2" color="text.secondary" fontWeight={700}>
        Add the code to one of these fields
      </Typography>
      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
        {STORE_LISTING_PLACEMENT_FIELDS.map((field) => (
          <Typography key={field} component="li" variant="body2" color="text.secondary">
            {field}
          </Typography>
        ))}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Publish the store update, wait for the listing page to refresh, then use{" "}
        <strong>Check store listing</strong> on the final step. {APP_NAME} fetches the
        public URL and searches for your code.
      </Typography>

      <Typography variant="caption" color="text.secondary">
        Prefer website verification when you have a site. Store listing verification is
        a backup when hosting a file is not practical.
      </Typography>
    </Stack>
  );
}

function WebGuidePanel({ hasCheckUrl }: { hasCheckUrl: boolean }) {
  if (!hasCheckUrl) {
    return (
      <Typography variant="body2" color="text.secondary">
        Add a Web platform URL or Live URL on your listing so we know which domain to
        check.
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {APP_NAME} checks the verification URL above directly. Your web app must serve the
      file at that exact path.
    </Typography>
  );
}

function NativeWebsiteGuidePanel({ guide }: { guide: OwnershipVerificationPlatformGuide }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {nativePlatformOwnershipNote(guide.platform)}
    </Typography>
  );
}

export function PlatformPlacementGuide({
  guides,
  webOrigin,
  verificationCheckUrl,
  storeListingCode,
}: Props) {
  const defaultExpanded = useMemo(() => {
    const ios = guides.find((g) => g.platform === "ios");
    const android = guides.find((g) => g.platform === "android");
    const web = guides.find((g) => g.platform === "web");
    const pick =
      ios?.method === "native_store_listing"
        ? ios.platform
        : android?.method === "native_store_listing"
          ? android.platform
          : web?.platform ?? guides[0]?.platform;
    return pick ?? false;
  }, [guides]);

  const [expanded, setExpanded] = useState<string | false>(
    defaultExpanded ? String(defaultExpanded) : false,
  );

  if (!guides.length) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Add at least one platform on your listing to see placement instructions.
      </Alert>
    );
  }

  const hasStoreGuide = guides.some((g) => g.method === "native_store_listing");

  return (
    <Stack spacing={2}>
      {!webOrigin && !hasStoreGuide ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Add a <strong>Web</strong> platform URL, a live site URL, or your App Store /
          Play Store listing URL so we can verify ownership.
        </Alert>
      ) : null}

      {verificationCheckUrl ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            borderColor: "primary.main",
            bgcolor: "action.hover",
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={800}>
              Option A: Website file (primary)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Host one plain text file on your site. This works for web apps and is the
              fastest check when you control the domain.
            </Typography>
            <WellKnownSteps />
            <Link
              href={verificationCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                fontWeight: 600,
                wordBreak: "break-all",
              }}
            >
              {verificationCheckUrl}
              <LaunchRoundedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
            </Link>
          </Stack>
        </Paper>
      ) : null}

      {hasStoreGuide ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom>
            Option B: Store listing text (iOS / Android backup)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add your store code to the public App Store or Play Store page. We cannot
            inspect the app binary; this proves you can edit the listing.
          </Typography>
        </Paper>
      ) : null}

      <Stack spacing={0}>
        {guides.map((guide) => {
          const panelId = guide.platform;
          const isExpanded = expanded === panelId;

          return (
            <Accordion
              key={panelId}
              expanded={isExpanded}
              onChange={(_e, next) => setExpanded(next ? panelId : false)}
              disableGutters
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px !important",
                "&:not(:last-child)": { mb: 1 },
                "&::before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {guide.label}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {guide.method === "native_store_listing" ? (
                  <StoreListingGuidePanel
                    guide={guide}
                    storeListingCode={storeListingCode}
                  />
                ) : null}
                {guide.method === "web_well_known" || guide.method === "website_required" ? (
                  <WebGuidePanel hasCheckUrl={Boolean(verificationCheckUrl)} />
                ) : null}
                {guide.method === "native_use_website" ? (
                  <NativeWebsiteGuidePanel guide={guide} />
                ) : null}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Stack>
  );
}
