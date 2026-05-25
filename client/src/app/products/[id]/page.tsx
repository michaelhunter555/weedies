"use client";

import { useParams } from "next/navigation";

import { ProductDetailsClient } from "../product-details-client";

/** Legacy single segment: `/products/{mongoId}` or `/products/{slug}`. */
export default function LegacyProductSegmentPage() {
  const params = useParams<{ id: string }>();
  const segment = decodeURIComponent(params?.id ?? "").trim();

  return <ProductDetailsClient fetchBy={segment} />;
}
