"use client";

import { useParams } from "next/navigation";

export default function CartPage() {
  const params = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <h1>Cart</h1>
      <p>Cart ID: {params?.id}</p>
    </div>
  );
}


