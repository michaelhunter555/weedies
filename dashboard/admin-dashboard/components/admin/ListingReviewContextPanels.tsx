"use client";

import Link from "next/link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  formatTransactionMoney,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/transaction-labels";
import type {
  AdminListingPaymentsSnapshot,
  AdminListingReviewContext,
  AdminListingTransactionSnapshot,
} from "@/lib/admin-listing-types";

function linkStatusChip(status: string) {
  switch (status) {
    case "ok":
      return <Chip size="small" color="success" label="Valid domain" />;
    case "wrong_domain":
      return <Chip size="small" color="error" label="Wrong domain" />;
    case "missing":
      return <Chip size="small" color="warning" label="Missing" />;
    case "not_required":
      return <Chip size="small" variant="outlined" label="No URL" />;
    default:
      return <Chip size="small" variant="outlined" label={status} />;
  }
}

function LinkCheckRows({
  title,
  links,
  emptyMessage,
}: {
  title: string;
  links: AdminListingReviewContext["platformLinks"];
  emptyMessage: string;
}) {
  if (!links.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Paper>
    );
  }

  const hasProblems = links.some(
    (l) => l.status === "missing" || l.status === "wrong_domain",
  );

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
        {hasProblems ? (
          <Chip size="small" color="warning" label="Review links" />
        ) : (
          <Chip size="small" color="success" label="All set" />
        )}
      </Stack>
      <Stack spacing={1.25} divider={<Divider flexItem />}>
        {links.map((row) => (
          <Stack
            key={row.platform}
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ minWidth: 120 }}
            >
              {row.label}
            </Typography>
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              {row.url ? (
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  <a href={row.url} target="_blank" rel="noreferrer">
                    {row.url}
                  </a>
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  —
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {row.message}
                {row.expectedPrefix ? ` · Expected: ${row.expectedPrefix}` : ""}
              </Typography>
            </Stack>
            {linkStatusChip(row.status)}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function TransactionBlock({
  title,
  tx,
  stripeStatus,
}: {
  title: string;
  tx: AdminListingTransactionSnapshot | null;
  stripeStatus?: string | null;
}) {
  if (!tx) {
    return (
      <Typography variant="body2" color="text.secondary">
        No {title.toLowerCase()} transaction on file.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2">
        Status:{" "}
        {PAYMENT_STATUS_LABELS[tx.paymentStatus ?? ""] ??
          tx.paymentStatus ??
          "—"}{" "}
        · {PAYMENT_TYPE_LABELS[tx.paymentType ?? ""] ?? tx.paymentType ?? "—"}
      </Typography>
      <Typography variant="body2">
        Amount: {formatTransactionMoney(tx.amountPaidCents)} · Fee:{" "}
        {formatTransactionMoney(tx.serviceFeeCents)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
        Tx {tx.id}
        {tx.stripePaymentIntentId
          ? ` · PI ${tx.stripePaymentIntentId}`
          : ""}
        {tx.chargeId ? ` · Charge ${tx.chargeId}` : ""}
        {tx.escrowTransactionId
          ? ` · Escrow ${tx.escrowTransactionId}`
          : ""}
      </Typography>
      {tx.createdAt ? (
        <Typography variant="caption" color="text.secondary">
          Recorded {new Date(tx.createdAt).toLocaleString()}
        </Typography>
      ) : null}
      {stripeStatus ? (
        <Typography variant="caption" color="text.secondary">
          Stripe PaymentIntent status: {stripeStatus}
        </Typography>
      ) : null}
      <Link
        href={`/admin/transactions?id=${encodeURIComponent(tx.id)}`}
        style={{ fontSize: "0.875rem", fontWeight: 600 }}
      >
        Open in transactions
      </Link>
    </Stack>
  );
}

export function ListingReviewContextPanels({
  reviewContext,
}: {
  reviewContext: AdminListingReviewContext | null | undefined;
}) {
  if (!reviewContext) return null;

  const { platformLinks, socialLinks, payments } = reviewContext;
  const listingFeePending = payments.listingStatus === "pending_listing_fee";
  const missingPlatformLinks = platformLinks.some((l) => l.status === "missing");
  const badPlatformLinks = platformLinks.some((l) => l.status === "wrong_domain");

  return (
    <Stack spacing={2}>
      {(listingFeePending || missingPlatformLinks || badPlatformLinks) && (
        <Alert severity="warning">
          {listingFeePending
            ? "Listing fee has not been completed yet. "
            : ""}
          {missingPlatformLinks
            ? "One or more platform store links are missing. "
            : ""}
          {badPlatformLinks
            ? "One or more platform URLs use the wrong domain."
            : ""}
        </Alert>
      )}

      <LinkCheckRows
        title="Platform store links"
        links={platformLinks}
        emptyMessage="No platforms selected on this listing."
      />

      <LinkCheckRows
        title="Social media links"
        links={socialLinks}
        emptyMessage="No social accounts selected on this listing."
      />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Payments & transactions
        </Typography>
        <Stack spacing={2} divider={<Divider flexItem />}>
          <Stack spacing={0.75}>
            <Typography variant="body2">
              Listing status: <strong>{payments.listingStatus}</strong>
            </Typography>
            {payments.sellerCommittedAt ? (
              <Typography variant="caption" color="text.secondary">
                Seller committed {new Date(payments.sellerCommittedAt).toLocaleString()}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              Private listing fee paid:{" "}
              {payments.privateListingFeePaid ? "Yes" : "No"}
            </Typography>
            {payments.listingFeePaymentIntentId ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
              >
                Listing fee PI: {payments.listingFeePaymentIntentId}
              </Typography>
            ) : null}
          </Stack>

          <TransactionBlock
            title="Listing fee"
            tx={payments.listingFee}
            stripeStatus={payments.listingFeeStripeStatus}
          />

          <TransactionBlock title="Purchase (buyer checkout)" tx={payments.purchase} />
        </Stack>

        <Typography
          component={Link}
          href="/admin/transactions"
          variant="body2"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            mt: 2,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          All transactions
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </Typography>
      </Paper>
    </Stack>
  );
}
