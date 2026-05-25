"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import { APP_NAME } from "@/brand";
import { BRAND_PALETTE } from "@/theme/brand-palette";

type Props = {
  open: boolean;
  onClose: () => void;
};

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

function SecuritySection({ icon, title, children }: SectionProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          mt: 0.25,
          width: 36,
          height: 36,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: BRAND_PALETTE.mint,
          border: `1px solid ${BRAND_PALETTE.sage}`,
          color: BRAND_PALETTE.seafoam,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={800} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          {children}
        </Typography>
      </Box>
    </Stack>
  );
}

export function PlatformSecurityModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 5, fontWeight: 900, lineHeight: 1.2 }}>
        How {APP_NAME} keeps deals safe
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 500 }}>
          Built for secure app acquisitions, from checkout through handover and payout.
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5 }}>
        <Stack spacing={2.5}>
          <SecuritySection
            icon={<SwapHorizRoundedIcon fontSize="small" />}
            title="The exchange model"
          >
            After checkout, buyer and seller meet in a dedicated exchange room. Payment is
            typically authorized first, then captured by the seller when handover is ready.
            The buyer confirms receipt when satisfied, so funds move only after both sides
            complete the steps we surface in the product. Optional deliverables and messaging
            stay tied to that sale.
          </SecuritySection>

          <SecuritySection
            icon={<LockRoundedIcon fontSize="small" />}
            title="Stripe Checkout & card security"
          >
            Buyers pay through Stripe Checkout with industry-standard encryption and fraud
            tools. {APP_NAME} does not store full card numbers. Sellers receive payouts through Stripe
            Connect, which handles identity verification and compliance for marketplace sellers.
          </SecuritySection>

          <SecuritySection
            icon={<PaymentsRoundedIcon fontSize="small" />}
            title="Payouts for US & Canada sellers"
          >
            Once a sale is captured and the exchange completes, proceeds route to the
            seller&apos;s connected Stripe account. For sellers based in the United States and
            Canada, payouts typically clear to the bank on average within about two business
            days (timing can vary by bank and Stripe&apos;s schedule).
          </SecuritySection>

          <SecuritySection
            icon={<VerifiedUserRoundedIcon fontSize="small" />}
            title="What we expect from the community"
          >
            Listings should be accurate; incomplete or misleading apps may be rejected. Private
            listings, auctions, and buy-it-now sales all use the same payment and exchange
            rails. For disputes or chargebacks, Stripe and card-network rules apply alongside
            our Terms.
          </SecuritySection>

          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Timelines are estimates, not guarantees. See our Terms and Privacy Policy for full
            legal details.
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
