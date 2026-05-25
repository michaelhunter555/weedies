"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MessageRoundedIcon from "@mui/icons-material/MessageRounded";

import type { Listing } from "../../../types";
import { firstNameFromDisplayName } from "@/utils/user-locale";

type PendingRequest = NonNullable<Listing["pendingPrivateListingRequests"]>[number];

type Props = {
  open: boolean;
  listing: Listing | null;
  onClose: () => void;
  onResolve: (
    listingId: string,
    requestId: string,
    decision: "approve" | "deny",
  ) => void;
  loadingKey: string | null;
};

function requesterDisplayName(req: PendingRequest): string {
  return req.requester?.name?.trim() || "User";
}

function requesterRegion(req: PendingRequest): string {
  if (req.requester?.regionLabel) return req.requester.regionLabel;
  const loc = req.requester?.locale;
  if (loc) return loc;
  if (req.requester?.timezone) return req.requester.timezone;
  return "—";
}

export function PrivateAccessRequestsModal({
  open,
  listing,
  onClose,
  onResolve,
  loadingKey,
}: Props) {
  const router = useRouter();

  const pending = useMemo(
    () =>
      (listing?.pendingPrivateListingRequests ?? []).filter(
        (r) => r.status === "pending",
      ),
    [listing?.pendingPrivateListingRequests],
  );

  const listingId = listing?._id ? String(listing._id) : "";
  const listingName = listing?.appName ?? "Listing";

  const handleMessage = (req: PendingRequest) => {
    const requesterId = req.requester?.id ?? String(req.requesterId ?? "");
    if (!requesterId) return;
    const q = new URLSearchParams();
    q.set("sellerId", requesterId);
    if (listingId) q.set("listingId", listingId);
    q.set("subject", listingName);
    const note = req.message?.trim();
    if (note) q.set("prefill", note);
    router.push(`/messages?${q.toString()}`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 5 }}>
        Private access requests
        {listing?.appName ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {listing.appName}
          </Typography>
        ) : null}
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {pending.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No pending requests.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {pending.map((req) => {
              const reqId = req._id ? String(req._id) : "";
              const name = requesterDisplayName(req);
              const region = requesterRegion(req);
              const rowKey = `${listingId}:${reqId}`;
              const busy = loadingKey === rowKey;
              const messageLabel = `Message ${firstNameFromDisplayName(name)}`;

              return (
                <Box
                  key={reqId || String(req.requesterId)}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                    spacing={1.25}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      flexWrap="wrap"
                      spacing={0.75}
                      sx={{ minWidth: 0, flex: 1 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {region}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<MessageRoundedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleMessage(req)}
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          minWidth: 0,
                          px: 0.5,
                        }}
                      >
                        {messageLabel}
                      </Button>
                    </Stack>
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        disabled={!listingId || !reqId || busy}
                        onClick={() => onResolve(listingId, reqId, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={!listingId || !reqId || busy}
                        onClick={() => onResolve(listingId, reqId, "deny")}
                      >
                        Deny
                      </Button>
                    </Stack>
                  </Stack>
                  {req.message?.trim() ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1, lineHeight: 1.45 }}
                    >
                      “{req.message.trim()}”
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
