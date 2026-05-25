"use client";

import { useState } from "react";

import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Paper,
  Typography,
} from "@mui/material";

import type { MarketplaceFaq } from "@/content/marketplace-faqs";
import { BRAND_PALETTE } from "@/theme/brand-palette";

type Props = {
  items: MarketplaceFaq[];
};

export function FaqAccordion({ items }: Props) {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange =
    (panelId: string) => (_: React.SyntheticEvent, isOpen: boolean) => {
      setExpanded(isOpen ? panelId : false);
    };

  return (
    <>
      {items.map((faq) => (
        <Accordion
          key={faq.id}
          disableGutters
          elevation={0}
          expanded={expanded === faq.id}
          onChange={handleChange(faq.id)}
          sx={{
            mb: 1,
            borderRadius: "12px !important",
            border: `1px solid ${BRAND_PALETTE.sage}`,
            "&:before": { display: "none" },
            overflow: "hidden",
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRoundedIcon />}
            sx={{
              px: 2,
              minHeight: 52,
              "& .MuiAccordionSummary-content": { my: 1 },
            }}
          >
            <Typography fontWeight={700}>{faq.question}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {faq.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}

/** Optional intro card above the accordion list. */
export function FaqIntroCard({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: 3,
        borderColor: BRAND_PALETTE.sage,
        bgcolor: BRAND_PALETTE.mint,
      }}
    >
      {children}
    </Paper>
  );
}
