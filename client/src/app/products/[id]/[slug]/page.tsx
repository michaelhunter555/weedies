"use client";

import { useParams } from "next/navigation";

import { ProductDetailsClient } from "../../product-details-client";

/** `/products/{id}/{slug}` - first segment is Mongo id; slug is for readable URLs. */
export default function ProductByIdAndSlugPage() {
  const params = useParams<{ id: string; slug: string }>();
  const listingId = decodeURIComponent(params?.id ?? "").trim();

  return <ProductDetailsClient fetchBy={listingId} />;
}
