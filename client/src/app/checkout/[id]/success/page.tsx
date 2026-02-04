"use client";

import { useParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const params = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <h1>Checkout Success</h1>
      <p>Checkout ID: {params?.id}</p>
    </div>
  );
}


