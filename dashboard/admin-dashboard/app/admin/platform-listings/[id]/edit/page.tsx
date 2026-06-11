"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { PlatformListingForm } from "@/components/admin/PlatformListingForm";
import { fetchAdminListingById } from "@/lib/admin-api";
import { useAdminAuth } from "@/context/admin-auth-context";

export default function EditPlatformListingPage() {
  const params = useParams<{ id: string }>();
  const listingId = decodeURIComponent(params?.id ?? "").trim();
  const { accessToken, hydrated } = useAdminAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-listing", listingId],
    queryFn: () => fetchAdminListingById(listingId),
    enabled: hydrated && !!accessToken && !!listingId,
  });

  if (!listingId) {
    return <Alert severity="warning">Missing listing id.</Alert>;
  }

  if (!hydrated || isLoading) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!accessToken) {
    return <Alert severity="info">Sign in to edit platform listings.</Alert>;
  }

  if (error || !data?.listing) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Listing not found."}
      </Alert>
    );
  }

  if (data.listing.isPlatformListing !== true) {
    return (
      <Alert severity="warning">
        Only platform-managed listings can be edited here. Use the listings review page
        for seller submissions.
      </Alert>
    );
  }

  return (
    <PlatformListingForm
      mode="edit"
      listingId={listingId}
      initialListing={data.listing}
    />
  );
}
