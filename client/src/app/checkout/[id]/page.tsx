"use client";

import { useParams } from "next/navigation";

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <h1>Checkout</h1>
      <p>Checkout ID: {params?.id}</p>
    </div>
  );
}


