"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Stack, Typography } from "@mui/material";
import Collection from "@/components/Collections/Collection";

export default function ProductsPage() {
  const params = useSearchParams();
  const category = params.get("category");

  const title = useMemo(() => {
    if (!category) return "Shop";
    return category.charAt(0).toUpperCase() + category.slice(1);
  }, [category]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h3" fontWeight={700}>
            {title}
          </Typography>
          <Typography color="text.secondary">
            Browse flower, edibles, vapes, and more.
          </Typography>
        </Stack>

        <Collection collectionName={category ? `${title} Collection` : "Featured"} category={category || undefined} />
        {!category && (
          <>
            <Collection collectionName="Flower" category="flower" />
            <Collection collectionName="Edibles" category="edibles" />
            <Collection collectionName="Vapes" category="vapes" />
          </>
        )}
      </Stack>
    </Container>
  );
}


