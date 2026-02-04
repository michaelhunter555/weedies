import React from "react";
import { useRouter } from "next/router";
import { Container, Typography } from "@mui/material";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function OrderDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          Order Details
        </Typography>
        <Typography color="text.secondary">
          Order ID: {typeof id === "string" ? id : "—"}
        </Typography>
      </Container>
    </ProtectedRoute>
  );
}


