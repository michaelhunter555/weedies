"use client";

import { useParams } from "next/navigation";

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  return (
    <div style={{ padding: 24 }}>
      <h1>Support Ticket</h1>
      <p>Ticket ID: {params?.id}</p>
    </div>
  );
}


