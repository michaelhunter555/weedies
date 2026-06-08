import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";

import VerifyOwnershipWizard from "@/components/OwnershipVerification/VerifyOwnershipWizard";

function VerifyOwnershipFallback() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
      <CircularProgress />
    </Box>
  );
}

export default function VerifyOwnershipPage() {
  return (
    <Suspense fallback={<VerifyOwnershipFallback />}>
      <VerifyOwnershipWizard />
    </Suspense>
  );
}
