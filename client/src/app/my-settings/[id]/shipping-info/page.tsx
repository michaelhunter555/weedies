"use client";

import { useParams } from "next/navigation";

export default function ShippingInfoPage() {
  const params = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <h1>Shipping Info</h1>
      <p>User ID: {params?.id}</p>
    </div>
  );
}


