import Link from "next/link";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Box, Button, Container, Stack, Typography } from "@mui/material";

import { BRAND_PALETTE } from "@/theme/brand-palette";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
};

export function MarketingPageShell({
  title,
  subtitle,
  children,
  maxWidth = "md",
}: Props) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: { xs: 3, md: 5 } }}>
      <Button
        component={Link}
        href="/"
        startIcon={<ArrowBackRoundedIcon />}
        color="inherit"
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        Back to home
      </Button>

      <Stack spacing={1} sx={{ mt: 2, mb: 3 }}>
        <Typography
          variant="h3"
          fontWeight={900}
          sx={{ lineHeight: 1.15, color: BRAND_PALETTE.charcoal }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Stack>

      <Box>{children}</Box>
    </Container>
  );
}

type LegalSectionProps = {
  title: string;
  paragraphs: string[];
};

export function LegalSection({ title, paragraphs }: LegalSectionProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        {title}
      </Typography>
      {paragraphs.map((p) => (
        <Typography
          key={p.slice(0, 48)}
          variant="body2"
          color="text.secondary"
          paragraph
          sx={{ mb: 1.5, lineHeight: 1.7 }}
        >
          {p}
        </Typography>
      ))}
    </Box>
  );
}
