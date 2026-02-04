"use client";

import { useParams } from "next/navigation";

export default function OrderDetailsPage() {
  const params = useParams<{ id: string; orderId: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1>Order Details</h1>
      <p>User ID: {params?.id}</p>
      <p>Order ID: {params?.orderId}</p>
    </div>
  );
}


