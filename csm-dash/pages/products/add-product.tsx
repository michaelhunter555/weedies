import React from "react";
import { Container, Typography } from "@mui/material";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AddProductPage() {
  return (
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          Add Product
        </Typography>
        <Typography color="text.secondary">
          This page was empty (which breaks Next.js routing). Wire your add-product form here.
        </Typography>
      </Container>
    </ProtectedRoute>
  );
}


