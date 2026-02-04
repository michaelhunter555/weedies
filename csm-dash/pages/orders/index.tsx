import React from "react";
import { Container, Typography } from "@mui/material";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          Orders
        </Typography>
        <Typography color="text.secondary">
          This page was empty (which breaks Next.js routing). Render your orders table here.
        </Typography>
      </Container>
    </ProtectedRoute>
  );
}


