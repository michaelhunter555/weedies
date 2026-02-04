"use client";

import { useParams } from "next/navigation";

export default function OrderHistoryPage() {
  const params = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <h1>Order History</h1>
      <p>User ID: {params?.id}</p>
    </div>
  );
}


