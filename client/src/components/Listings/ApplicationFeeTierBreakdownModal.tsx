"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { BRAND_PALETTE } from "@/theme/brand-palette";
import {
  APPLICATION_FEE_TIERS,
  determineApplicationFee,
  formatApplicationFeePercent,
} from "@/utils/listingOptions";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Highlights the row that applies to this listing price. */
  currentPrice?: number;
};

function formatUsd(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const denseTableSx = {
  "& .MuiTableCell-root": {
    py: 0.4,
    px: 1.25,
    fontSize: "0.8125rem",
    lineHeight: 1.35,
    borderColor: BRAND_PALETTE.borderSubtle,
  },
  "& .MuiTableCell-head": {
    py: 0.5,
    fontWeight: 700,
    bgcolor: BRAND_PALETTE.listFormPanel,
    whiteSpace: "nowrap",
  },
} as const;

export function ApplicationFeeTierBreakdownModal({
  open,
  onClose,
  currentPrice,
}: Props) {
  const price =
    currentPrice != null && Number.isFinite(currentPrice) ? currentPrice : null;
  const activeRate = price != null ? determineApplicationFee(price) : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle
        sx={{
          pr: 5,
          py: 1.5,
          fontWeight: 800,
          fontSize: "1.05rem",
        }}
      >
        Success fee tiers
        <IconButton
          aria-label="Close"
          onClick={onClose}
          size="small"
          sx={{ position: "absolute", right: 10, top: 10 }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 2, py: 1.5 }}>
        <TableContainer>
          <Table size="small" sx={denseTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Sale price</TableCell>
                <TableCell align="right">Platform fee</TableCell>
                <TableCell align="right">You keep</TableCell>
                {price != null ? (
                  <TableCell align="right">At your price</TableCell>
                ) : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {APPLICATION_FEE_TIERS.map((tier) => {
                const isActive = activeRate === tier.rate;
                const exampleFee =
                  isActive && price != null ? Math.max(0, price * tier.rate) : null;

                return (
                  <TableRow
                    key={tier.priceRangeLabel}
                    selected={isActive}
                    sx={{
                      "&.Mui-selected": { bgcolor: "rgba(224, 245, 232, 0.5)" },
                      "&.Mui-selected:hover": { bgcolor: "rgba(224, 245, 232, 0.65)" },
                    }}
                  >
                    <TableCell sx={{ fontWeight: isActive ? 700 : 400 }}>
                      {tier.priceRangeLabel}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isActive ? 700 : 400 }}>
                      {formatApplicationFeePercent(tier.rate)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: isActive ? 700 : 400 }}>
                      {formatApplicationFeePercent(1 - tier.rate)}
                    </TableCell>
                    {price != null ? (
                      <TableCell align="right" sx={{ fontWeight: isActive ? 700 : 400 }}>
                        {exampleFee != null ? formatUsd(exampleFee) : "—"}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 1.25, lineHeight: 1.45 }}
        >
          Charged only when your app sells. Listing fees at publish are separate.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
